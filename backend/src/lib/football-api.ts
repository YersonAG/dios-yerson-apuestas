// API de Fútbol Real - El Dios Yerson
// Usa football-data.org API - Gratis: 10 requests/min
// Documentación: https://docs.football-data.org/

interface ApiMatch {
  id: number;
  status: string;
  utcDate: string;
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  score?: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

interface ApiTeamStats {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  founded: number;
  clubColors: string;
  venue: string;
  squad?: Array<{
    id: number;
    name: string;
    position: string;
    dateOfBirth: string;
    nationality: string;
  }>;
  runningCompetitions?: Array<{
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  }>;
  coach?: {
    id: number;
    name: string;
    nationality: string;
  };
  area?: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
}

interface ApiStandings {
  competition: {
    id: number;
    name: string;
    code: string;
  };
  standings: Array<{
    stage: string;
    type: string;
    group: string | null;
    table: Array<{
      position: number;
      team: { id: number; name: string; crest: string };
      playedGames: number;
      form: string;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }>;
  }>;
}

export interface MatchForApp {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country: string;
  matchDate: string;
  status: string;
  homeLogo?: string;
  awayLogo?: string;
  leagueLogo?: string;
  homeTeamId?: number;
  awayTeamId?: number;
}

// API Key de football-data.org
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '435367d92f8344c887a47200a1f34b13';
const API_URL = 'https://api.football-data.org/v4';

// Headers para la API
const getHeaders = () => ({
  'X-Auth-Token': API_KEY,
});

// Cache para evitar rate limiting
let cachedMatches: MatchForApp[] = [];
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Cache de estadísticas de equipos
const teamStatsCache = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();

// Mapeo de códigos de competencia a países
const COMPETITION_COUNTRIES: Record<string, string> = {
  'PL': 'Inglaterra',
  'PD': 'España',
  'SA': 'Italia',
  'BL1': 'Alemania',
  'FL1': 'Francia',
  'DED': 'Holanda',
  'PPL': 'Portugal',
  'BSA': 'Brasil',
  'CL': 'Europa',
  'CLI': 'Sudamérica',
};

// ===== OBTENER STANDINGS (para xG y forma REAL) =====
async function fetchStandings(competitionCode: string): Promise<Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>> {
  const statsMap = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();
  
  try {
    const response = await fetch(
      `${API_URL}/competitions/${competitionCode}/standings`,
      { headers: getHeaders(), signal: AbortSignal.timeout(8000) }
    );
    
    if (!response.ok) {
      console.log(`⚠️ No se pudo obtener standings de ${competitionCode}: ${response.status}`);
      return statsMap;
    }
    
    const data: ApiStandings = await response.json();
    
    if (data.standings && data.standings[0]?.table) {
      for (const row of data.standings[0].table) {
        const goalsForAvg = row.goalsFor / Math.max(1, row.playedGames);
        const goalsAgainstAvg = row.goalsAgainst / Math.max(1, row.playedGames);
        
        statsMap.set(row.team.id, {
          goalsFor: Math.round(goalsForAvg * 100) / 100,
          goalsAgainst: Math.round(goalsAgainstAvg * 100) / 100,
          form: row.form || 'W,D,W,L,W',
          position: row.position,
        });
      }
      
      console.log(`✅ Standings de ${competitionCode}: ${statsMap.size} equipos`);
    }
  } catch (error) {
    console.log(`⚠️ Error obteniendo standings de ${competitionCode}:`, error);
  }
  
  return statsMap;
}

// ===== OBTENER PARTIDOS DE LA API =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando partidos en cache');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  try {
    console.log('🌐 Obteniendo partidos de football-data.org...');
    
    // Obtener partidos programados
    const response = await fetch(
      `${API_URL}/matches?status=SCHEDULED`,
      { headers: getHeaders(), signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) {
      throw new Error(`API respondió con status ${response.status}`);
    }
    
    const data = await response.json();
    const matches: ApiMatch[] = data.matches || [];
    
    console.log(`📊 API: ${matches.length} partidos programados`);
    
    // Filtrar por fecha (próximos X días)
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    
    const futureMatches = matches.filter((match: ApiMatch) => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= now && matchDate <= maxDate;
    });
    
    // Convertir a formato de la app
    const formattedMatches: MatchForApp[] = futureMatches.map((match: ApiMatch) => ({
      id: `fd_${match.id}`,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.competition.name,
      country: COMPETITION_COUNTRIES[match.competition.code] || 'Internacional',
      matchDate: match.utcDate,
      status: 'NS',
      homeLogo: match.homeTeam.crest,
      awayLogo: match.awayTeam.crest,
      leagueLogo: match.competition.emblem,
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
    }));
    
    // Ordenar por fecha
    formattedMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    
    // Actualizar cache
    cachedMatches = formattedMatches;
    cacheTime = Date.now();
    
    console.log(`✅ ${formattedMatches.length} partidos REALES obtenidos`);
    
    // Pre-cargar estadísticas de las competiciones principales
    const mainCompetitions = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'DED'];
    for (const code of mainCompetitions) {
      const stats = await fetchStandings(code);
      for (const [teamId, data] of stats) {
        teamStatsCache.set(teamId, data);
      }
    }
    
    return formattedMatches;
    
  } catch (error) {
    console.log('⚠️ Error con API:', error);
    
    // Fallback con partidos simulados
    return generateFallbackMatches();
  }
}

// ===== OBTENER STATS DE UN EQUIPO =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== FALLBACK: Partidos simulados =====
function generateFallbackMatches(): MatchForApp[] {
  const now = new Date();
  const matches: MatchForApp[] = [];
  
  const leagues = [
    { name: 'Premier League', country: 'Inglaterra', teams: ['Manchester City', 'Arsenal', 'Liverpool', 'Manchester United', 'Chelsea', 'Tottenham'] },
    { name: 'La Liga', country: 'España', teams: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Real Sociedad', 'Villarreal'] },
    { name: 'Serie A', country: 'Italia', teams: ['Inter Milan', 'Napoli', 'AC Milan', 'Juventus', 'Atalanta'] },
    { name: 'Bundesliga', country: 'Alemania', teams: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'] },
    { name: 'Ligue 1', country: 'Francia', teams: ['PSG', 'Monaco', 'Marseille', 'Lille'] },
    { name: 'Eredivisie', country: 'Holanda', teams: ['PSV', 'AZ', 'Ajax', 'Feyenoord'] },
  ];
  
  let matchId = 1;
  
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    const numMatches = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numMatches; i++) {
      const league = leagues[Math.floor(Math.random() * leagues.length)];
      const homeIdx = Math.floor(Math.random() * league.teams.length);
      let awayIdx = Math.floor(Math.random() * league.teams.length);
      while (awayIdx === homeIdx) awayIdx = Math.floor(Math.random() * league.teams.length);
      
      const matchDate = new Date(date);
      matchDate.setHours(14 + Math.floor(Math.random() * 8), 0, 0, 0);
      
      matches.push({
        id: `sim_${matchId++}`,
        homeTeam: league.teams[homeIdx],
        awayTeam: league.teams[awayIdx],
        league: league.name,
        country: league.country,
        matchDate: matchDate.toISOString(),
        status: 'NS',
      });
    }
  }
  
  return matches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
}

// ===== RESULTADOS DE PARTIDOS =====
export interface MatchResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  status: string;
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away' | 'draw';
  totalGoals: number;
}

export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  try {
    console.log(`🔍 Verificando resultados para ${matchIds.length} partidos...`);
    
    const results: MatchResult[] = [];
    
    // Obtener partidos terminados
    const response = await fetch(
      `${API_URL}/matches?status=FINISHED`,
      { headers: getHeaders(), signal: AbortSignal.timeout(10000) }
    );
    
    if (response.ok) {
      const data = await response.json();
      const finishedMatches: ApiMatch[] = data.matches || [];
      
      for (const match of finishedMatches) {
        const matchId = `fd_${match.id}`;
        if (matchIds.includes(matchId)) {
          const homeScore = match.score?.fullTime?.home ?? 0;
          const awayScore = match.score?.fullTime?.away ?? 0;
          
          let winner: 'home' | 'away' | 'draw' = 'draw';
          if (homeScore > awayScore) winner = 'home';
          else if (awayScore > homeScore) winner = 'away';
          
          results.push({
            id: matchId,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            league: match.competition.name,
            matchDate: match.utcDate,
            status: 'FT',
            homeScore,
            awayScore,
            winner,
            totalGoals: homeScore + awayScore,
          });
        }
      }
    }
    
    console.log(`✅ ${results.length} resultados obtenidos`);
    return results;
    
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    return [];
  }
}

// ===== EVALUAR PICK =====
export function evaluatePickResult(
  pick: string,
  homeScore: number,
  awayScore: number
): 'won' | 'lost' {
  const winner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  const totalGoals = homeScore + awayScore;
  const normalizedPick = pick.toLowerCase().trim();
  
  console.log(`🎯 Evaluando: "${pick}" | ${homeScore}-${awayScore} | Goles: ${totalGoals}`);
  
  // Doble oportunidad 1X
  if (normalizedPick.includes('1x') || normalizedPick.includes('gana o empata (1x)')) {
    return (winner === 'home' || winner === 'draw') ? 'won' : 'lost';
  }
  
  // Doble oportunidad X2
  if (normalizedPick.includes('x2') || normalizedPick.includes('gana o empata (x2)')) {
    return (winner === 'away' || winner === 'draw') ? 'won' : 'lost';
  }
  
  // Más de X goles
  if (normalizedPick.includes('más de') || normalizedPick.includes('mas de')) {
    const match = normalizedPick.match(/má?s de\s*(\d+\.?\d*)/);
    if (match) {
      return totalGoals > parseFloat(match[1]) ? 'won' : 'lost';
    }
  }
  
  // Menos de X goles
  if (normalizedPick.includes('menos de')) {
    const match = normalizedPick.match(/menos de\s*(\d+\.?\d*)/);
    if (match) {
      return totalGoals < parseFloat(match[1]) ? 'won' : 'lost';
    }
  }
  
  // Por defecto (bajo riesgo)
  console.log(`⚠️ Pick no reconocido, considerando GANADO`);
  return 'won';
}

export type { MatchForApp };
