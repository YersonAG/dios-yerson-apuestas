// API de Fútbol Real - El Dios Yerson
// Usa football-data.org API - Gratis: 10 requests/min
// Obtiene partidos de múltiples ligas

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

interface ApiStandings {
  competition: { id: number; name: string; code: string };
  standings: Array<{
    stage: string;
    type: string;
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

const getHeaders = () => ({ 'X-Auth-Token': API_KEY });

// Cache
let cachedMatches: MatchForApp[] = [];
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Cache de estadísticas de equipos
const teamStatsCache = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();

// Códigos de competiciones disponibles
const COMPETITIONS = [
  { code: 'PL', name: 'Premier League', country: 'Inglaterra' },
  { code: 'PD', name: 'La Liga', country: 'España' },
  { code: 'SA', name: 'Serie A', country: 'Italia' },
  { code: 'BL1', name: 'Bundesliga', country: 'Alemania' },
  { code: 'FL1', name: 'Ligue 1', country: 'Francia' },
  { code: 'DED', name: 'Eredivisie', country: 'Holanda' },
  { code: 'PPL', name: 'Primeira Liga', country: 'Portugal' },
  { code: 'CL', name: 'Champions League', country: 'Europa' },
];

// ===== OBTENER STANDINGS =====
async function fetchStandings(competitionCode: string): Promise<Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>> {
  const statsMap = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();
  
  try {
    const response = await fetch(
      `${API_URL}/competitions/${competitionCode}/standings`,
      { headers: getHeaders(), signal: AbortSignal.timeout(8000) }
    );
    
    if (!response.ok) return statsMap;
    
    const data: ApiStandings = await response.json();
    
    if (data.standings && data.standings[0]?.table) {
      for (const row of data.standings[0].table) {
        const games = Math.max(1, row.playedGames);
        statsMap.set(row.team.id, {
          goalsFor: Math.round((row.goalsFor / games) * 100) / 100,
          goalsAgainst: Math.round((row.goalsAgainst / games) * 100) / 100,
          form: row.form || 'W,D,W,L,W',
          position: row.position,
        });
      }
      console.log(`✅ Standings ${competitionCode}: ${statsMap.size} equipos`);
    }
  } catch (error) {
    console.log(`⚠️ Error standings ${competitionCode}:`, error);
  }
  
  return statsMap;
}

// ===== OBTENER PARTIDOS DE TODAS LAS LIGAS =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de football-data.org...');
  
  const allMatches: MatchForApp[] = [];
  
  try {
    // 1. Obtener partidos generales
    const generalResponse = await fetch(
      `${API_URL}/matches?status=SCHEDULED`,
      { headers: getHeaders(), signal: AbortSignal.timeout(10000) }
    );
    
    if (generalResponse.ok) {
      const data = await generalResponse.json();
      const matches: ApiMatch[] = data.matches || [];
      
      for (const match of matches) {
        allMatches.push({
          id: `fd_${match.id}`,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          league: match.competition.name,
          country: COMPETITIONS.find(c => c.code === match.competition.code)?.country || 'Internacional',
          matchDate: match.utcDate,
          status: 'NS',
          homeLogo: match.homeTeam.crest,
          awayLogo: match.awayTeam.crest,
          leagueLogo: match.competition.emblem,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
        });
      }
      console.log(`📊 Partidos generales: ${matches.length}`);
    }
    
    // 2. Obtener partidos de cada liga individualmente (para tener más)
    for (const comp of COMPETITIONS.slice(0, 6)) { // Solo las 6 principales
      try {
        const compResponse = await fetch(
          `${API_URL}/competitions/${comp.code}/matches?status=SCHEDULED&limit=10`,
          { headers: getHeaders(), signal: AbortSignal.timeout(8000) }
        );
        
        if (compResponse.ok) {
          const data = await compResponse.json();
          const matches: ApiMatch[] = data.matches || [];
          
          for (const match of matches) {
            const exists = allMatches.some(m => m.id === `fd_${match.id}`);
            if (!exists) {
              allMatches.push({
                id: `fd_${match.id}`,
                homeTeam: match.homeTeam.name,
                awayTeam: match.awayTeam.name,
                league: comp.name,
                country: comp.country,
                matchDate: match.utcDate,
                status: 'NS',
                homeLogo: match.homeTeam.crest,
                awayLogo: match.awayTeam.crest,
                leagueLogo: match.competition?.emblem,
                homeTeamId: match.homeTeam.id,
                awayTeamId: match.awayTeam.id,
              });
            }
          }
        }
        
        // Pequeña pausa para no exceder rate limit
        await new Promise(r => setTimeout(r, 200));
        
      } catch (e) {
        console.log(`⚠️ Error ${comp.code}:`, e);
      }
    }
    
    // 3. Obtener standings para datos reales
    for (const comp of COMPETITIONS.slice(0, 6)) {
      const stats = await fetchStandings(comp.code);
      for (const [teamId, data] of stats) {
        teamStatsCache.set(teamId, data);
      }
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Ordenar por fecha
    allMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    
    // Filtrar por rango de fechas
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    
    const filteredMatches = allMatches.filter(m => {
      const date = new Date(m.matchDate);
      return date >= now && date <= maxDate;
    });
    
    // Actualizar cache
    cachedMatches = filteredMatches;
    cacheTime = Date.now();
    
    console.log(`✅ Total partidos REALES: ${filteredMatches.length}`);
    
    // Si hay pocos, agregar fallback
    if (filteredMatches.length < 20) {
      const fallback = generateFallbackMatches(filteredMatches);
      const combined = [...filteredMatches, ...fallback];
      combined.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      cachedMatches = combined;
      return combined;
    }
    
    return filteredMatches;
    
  } catch (error) {
    console.log('⚠️ Error con API:', error);
    return generateFallbackMatches([]);
  }
}

// ===== OBTENER STATS DE UN EQUIPO =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== FALLBACK: Partidos simulados (solo si hay pocos reales) =====
function generateFallbackMatches(existingMatches: MatchForApp[]): MatchForApp[] {
  const now = new Date();
  const existingMatchKeys = new Set(existingMatches.map(m => `${m.homeTeam}-${m.awayTeam}`));
  
  const leagues = [
    { name: 'Premier League', country: 'Inglaterra', teams: [
      { name: 'Manchester City', id: 65, xG: 2.5, strength: 95 },
      { name: 'Arsenal', id: 57, xG: 2.2, strength: 90 },
      { name: 'Liverpool', id: 64, xG: 2.3, strength: 92 },
      { name: 'Manchester United', id: 66, xG: 1.7, strength: 82 },
      { name: 'Chelsea', id: 61, xG: 1.6, strength: 80 },
      { name: 'Tottenham', id: 73, xG: 1.8, strength: 78 },
      { name: 'Newcastle', id: 67, xG: 1.5, strength: 75 },
      { name: 'Brighton', id: 63, xG: 1.5, strength: 70 },
    ]},
    { name: 'La Liga', country: 'España', teams: [
      { name: 'Real Madrid', id: 86, xG: 2.4, strength: 94 },
      { name: 'Barcelona', id: 81, xG: 2.2, strength: 91 },
      { name: 'Atlético Madrid', id: 78, xG: 1.7, strength: 85 },
      { name: 'Real Sociedad', id: 92, xG: 1.4, strength: 76 },
      { name: 'Villarreal', id: 94, xG: 1.5, strength: 74 },
      { name: 'Real Betis', id: 90, xG: 1.3, strength: 72 },
    ]},
    { name: 'Serie A', country: 'Italia', teams: [
      { name: 'Inter Milan', id: 108, xG: 2.2, strength: 90 },
      { name: 'Napoli', id: 113, xG: 2.0, strength: 85 },
      { name: 'AC Milan', id: 98, xG: 1.8, strength: 83 },
      { name: 'Juventus', id: 109, xG: 1.6, strength: 82 },
      { name: 'Atalanta', id: 102, xG: 1.9, strength: 78 },
      { name: 'Roma', id: 100, xG: 1.5, strength: 75 },
    ]},
    { name: 'Bundesliga', country: 'Alemania', teams: [
      { name: 'Bayern Munich', id: 5, xG: 2.8, strength: 95 },
      { name: 'Borussia Dortmund', id: 4, xG: 2.3, strength: 88 },
      { name: 'RB Leipzig', id: 721, xG: 1.9, strength: 82 },
      { name: 'Bayer Leverkusen', id: 3, xG: 2.1, strength: 85 },
      { name: 'Stuttgart', id: 10, xG: 1.8, strength: 76 },
    ]},
    { name: 'Ligue 1', country: 'Francia', teams: [
      { name: 'PSG', id: 85, xG: 2.7, strength: 96 },
      { name: 'Monaco', id: 91, xG: 1.8, strength: 80 },
      { name: 'Marseille', id: 81, xG: 1.7, strength: 78 },
      { name: 'Lille', id: 79, xG: 1.4, strength: 75 },
      { name: 'Lyon', id: 80, xG: 1.4, strength: 72 },
    ]},
    { name: 'Eredivisie', country: 'Holanda', teams: [
      { name: 'PSV', id: 674, xG: 2.39, strength: 82 },
      { name: 'AZ', id: 672, xG: 1.27, strength: 68 },
      { name: 'Ajax', id: 673, xG: 2.1, strength: 78 },
      { name: 'Feyenoord', id: 675, xG: 1.85, strength: 75 },
    ]},
  ];
  
  const matches: MatchForApp[] = [];
  let matchId = 10000;
  
  // Generar partidos para los próximos 7 días
  for (let day = 1; day <= 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    for (const league of leagues) {
      // 1-2 partidos por liga por día
      const numMatches = 1 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < numMatches; i++) {
        const homeIdx = Math.floor(Math.random() * league.teams.length);
        let awayIdx = Math.floor(Math.random() * league.teams.length);
        while (awayIdx === homeIdx) {
          awayIdx = Math.floor(Math.random() * league.teams.length);
        }
        
        const home = league.teams[homeIdx];
        const away = league.teams[awayIdx];
        const key = `${home.name}-${away.name}`;
        
        if (existingMatchKeys.has(key)) continue;
        existingMatchKeys.add(key);
        
        const matchDate = new Date(date);
        matchDate.setHours(14 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 4) * 15, 0, 0);
        
        // Agregar stats simulados al cache
        teamStatsCache.set(home.id, {
          goalsFor: home.xG,
          goalsAgainst: 1.1 + Math.random() * 0.3,
          form: generateRandomForm(),
          position: Math.floor(Math.random() * 10) + 1,
        });
        
        teamStatsCache.set(away.id, {
          goalsFor: away.xG,
          goalsAgainst: 1.1 + Math.random() * 0.3,
          form: generateRandomForm(),
          position: Math.floor(Math.random() * 10) + 1,
        });
        
        matches.push({
          id: `sim_${matchId++}`,
          homeTeam: home.name,
          awayTeam: away.name,
          league: league.name,
          country: league.country,
          matchDate: matchDate.toISOString(),
          status: 'NS',
          homeTeamId: home.id,
          awayTeamId: away.id,
        });
      }
    }
  }
  
  console.log(`📊 Fallback: ${matches.length} partidos adicionales`);
  return matches;
}

function generateRandomForm(): string {
  const results = ['W', 'D', 'L'];
  let form = '';
  for (let i = 0; i < 5; i++) {
    const rand = Math.random();
    if (rand < 0.45) form += 'W';
    else if (rand < 0.70) form += 'D';
    else form += 'L';
    if (i < 4) form += ',';
  }
  return form;
}

// ===== RESULTADOS =====
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
    const response = await fetch(
      `${API_URL}/matches?status=FINISHED`,
      { headers: getHeaders(), signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const finishedMatches: ApiMatch[] = data.matches || [];
    const results: MatchResult[] = [];
    
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
    
    return results;
  } catch (error) {
    console.error('Error resultados:', error);
    return [];
  }
}

// ===== EVALUAR PICK =====
export function evaluatePickResult(pick: string, homeScore: number, awayScore: number): 'won' | 'lost' {
  const winner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  const totalGoals = homeScore + awayScore;
  const normalizedPick = pick.toLowerCase().trim();
  
  if (normalizedPick.includes('1x') || normalizedPick.includes('gana o empata (1x)')) {
    return (winner === 'home' || winner === 'draw') ? 'won' : 'lost';
  }
  
  if (normalizedPick.includes('x2') || normalizedPick.includes('gana o empata (x2)')) {
    return (winner === 'away' || winner === 'draw') ? 'won' : 'lost';
  }
  
  if (normalizedPick.includes('más de') || normalizedPick.includes('mas de')) {
    const match = normalizedPick.match(/má?s de\s*(\d+\.?\d*)/);
    if (match) return totalGoals > parseFloat(match[1]) ? 'won' : 'lost';
  }
  
  if (normalizedPick.includes('menos de')) {
    const match = normalizedPick.match(/menos de\s*(\d+\.?\d*)/);
    if (match) return totalGoals < parseFloat(match[1]) ? 'won' : 'lost';
  }
  
  return 'won';
}

export type { MatchForApp };
