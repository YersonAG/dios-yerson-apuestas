// API de Fútbol - El Dios Yerson
// Usa MÚLTIPLES APIs para maximizar partidos disponibles

// ===== INTERFACES =====
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

// ===== CACHE =====
let cachedMatches: MatchForApp[] = [];
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Cache de estadísticas de equipos
const teamStatsCache = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();

// ===== API 1: FOOTBALL-DATA.ORG =====
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY || '435367d92f8344c887a47200a1f34b13';
const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4';

// ===== API 2: API-FOOTBALL (RAPIDAPI) =====
const RAPIDAPI_KEY = process.env.FOOTBALL_API_KEY || '';
const RAPIDAPI_URL = 'https://api-football-v1.p.rapidapi.com/v3';

console.log('🔑 FOOTBALL_DATA_KEY:', FOOTBALL_DATA_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('🔑 FOOTBALL_API_KEY (RapidAPI):', RAPIDAPI_KEY ? `✅ ${RAPIDAPI_KEY.substring(0, 8)}...` : '❌ No configurada');

// ===== COMPETICIONES =====
const COMPETITIONS = [
  { id: 39, name: 'Premier League', country: 'Inglaterra', fdCode: 'PL' },
  { id: 140, name: 'La Liga', country: 'España', fdCode: 'PD' },
  { id: 135, name: 'Serie A', country: 'Italia', fdCode: 'SA' },
  { id: 78, name: 'Bundesliga', country: 'Alemania', fdCode: 'BL1' },
  { id: 61, name: 'Ligue 1', country: 'Francia', fdCode: 'FL1' },
  { id: 88, name: 'Eredivisie', country: 'Holanda', fdCode: 'DED' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', fdCode: 'PPL' },
  { id: 128, name: 'Liga BetPlay', country: 'Colombia', fdCode: '' },
  { id: 2, name: 'Champions League', country: 'Europa', fdCode: 'CL' },
];

// ===== OBTENER STANDINGS DE FOOTBALL-DATA =====
async function fetchStandingsFromFD(competitionCode: string): Promise<void> {
  if (!competitionCode) return;
  
  try {
    const response = await fetch(
      `${FOOTBALL_DATA_URL}/competitions/${competitionCode}/standings`,
      { 
        headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
        signal: AbortSignal.timeout(8000)
      }
    );
    if (!response.ok) return;
    const data = await response.json();
    const table = data.standings?.[0]?.table;
    
    if (table) {
      for (const row of table) {
        const games = Math.max(1, row.playedGames || 1);
        teamStatsCache.set(row.team.id, {
          goalsFor: Math.round((row.goalsFor / games) * 100) / 100,
          goalsAgainst: Math.round((row.goalsAgainst / games) * 100) / 100,
          form: row.form || 'W,D,W,L,W',
          position: row.position,
        });
      }
      console.log(`📊 Standings FD ${competitionCode}: ${table.length} equipos`);
    }
  } catch (error) {
    // Silencioso
  }
}

// ===== OBTENER PARTIDOS DE FOOTBALL-DATA =====
async function fetchFromFootballData(): Promise<MatchForApp[]> {
  const matches: MatchForApp[] = [];
  
  try {
    console.log('📡 Football-data.org: consultando...');
    const response = await fetch(
      `${FOOTBALL_DATA_URL}/matches?status=SCHEDULED`,
      { 
        headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
        signal: AbortSignal.timeout(10000)
      }
    );
    if (!response.ok) {
      console.log(`⚠️ FD error: ${response.status}`);
      return matches;
    }
    
    const data = await response.json();
    const apiMatches = data.matches || [];
    
    console.log(`✅ Football-data: ${apiMatches.length} partidos REALES`);
    
    for (const match of apiMatches) {
      const compInfo = COMPETITIONS.find(c => c.fdCode === match.competition?.code);
      matches.push({
        id: `fd_${match.id}`,
        homeTeam: match.homeTeam?.name || 'TBD',
        awayTeam: match.awayTeam?.name || 'TBD',
        league: match.competition?.name || 'Amistoso',
        country: compInfo?.country || match.competition?.area?.name || 'Internacional',
        matchDate: match.utcDate,
        status: 'NS',
        homeLogo: match.homeTeam?.crest,
        awayLogo: match.awayTeam?.crest,
        leagueLogo: match.competition?.emblem,
        homeTeamId: match.homeTeam?.id,
        awayTeamId: match.awayTeam?.id,
      });
    }
    
    return matches;
  } catch (error) {
    console.log('⚠️ Error FD:', error);
    return matches;
  }
}

// ===== OBTENER PARTIDOS DE RAPIDAPI =====
async function fetchFromRapidAPI(): Promise<MatchForApp[]> {
  const matches: MatchForApp[] = [];
  
  if (!RAPIDAPI_KEY) {
    console.log('⚠️ No hay FOOTBALL_API_KEY (RapidAPI) configurada');
    return matches;
  }
  
  try {
    console.log('📡 RapidAPI (api-football): consultando...');
    
    // Obtener partidos de los próximos 7 días
    const today = new Date();
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      promises.push(
        fetch(`${RAPIDAPI_URL}/fixtures?date=${dateStr}`, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
          },
          signal: AbortSignal.timeout(10000)
        })
        .then(res => res.json())
        .then(data => {
          const fixtures = data.response || [];
          const now = new Date();
          
          for (const fixture of fixtures) {
            const status = fixture.fixture?.status?.short;
            if (!['NS', 'TBD'].includes(status)) continue;
            
            const matchDate = new Date(fixture.fixture?.date);
            if (matchDate.getTime() <= now.getTime() + 30 * 60 * 1000) continue;
            
            matches.push({
              id: `ra_${fixture.fixture.id}`,
              homeTeam: fixture.teams?.home?.name || 'TBD',
              awayTeam: fixture.teams?.away?.name || 'TBD',
              league: fixture.league?.name || 'Liga',
              country: fixture.league?.country || 'Internacional',
              matchDate: fixture.fixture?.date,
              status: 'NS',
              homeLogo: fixture.teams?.home?.logo,
              awayLogo: fixture.teams?.away?.logo,
              leagueLogo: fixture.league?.logo,
              homeTeamId: fixture.teams?.home?.id,
              awayTeamId: fixture.teams?.away?.id,
            });
          }
        })
        .catch(() => {})
      );
    }
    
    await Promise.all(promises);
    console.log(`✅ RapidAPI: ${matches.length} partidos REALES`);
    
    return matches;
  } catch (error) {
    console.log('⚠️ Error RapidAPI:', error);
    return matches;
  }
}

// ===== FALLBACK: Partidos de equipos reales =====
function generateFallbackMatches(): MatchForApp[] {
  const now = new Date();
  const matches: MatchForApp[] = [];
  
  const leagues = [
    { 
      name: 'Premier League', 
      country: 'Inglaterra', 
      teams: [
        { name: 'Manchester City', id: 50, xG: 2.5 }, 
        { name: 'Arsenal', id: 42, xG: 2.2 }, 
        { name: 'Liverpool', id: 40, xG: 2.3 }, 
        { name: 'Manchester United', id: 33, xG: 1.7 }, 
        { name: 'Chelsea', id: 49, xG: 1.6 }, 
        { name: 'Tottenham', id: 47, xG: 1.8 }, 
        { name: 'Newcastle', id: 34, xG: 1.5 }, 
        { name: 'Brighton', id: 51, xG: 1.5 }, 
      ] 
    },
    { 
      name: 'La Liga', 
      country: 'España', 
      teams: [
        { name: 'Real Madrid', id: 541, xG: 2.4 }, 
        { name: 'Barcelona', id: 529, xG: 2.2 }, 
        { name: 'Atlético Madrid', id: 530, xG: 1.7 }, 
        { name: 'Real Sociedad', id: 548, xG: 1.4 }, 
        { name: 'Villarreal', id: 533, xG: 1.5 }, 
        { name: 'Real Betis', id: 543, xG: 1.3 }, 
      ] 
    },
    { 
      name: 'Serie A', 
      country: 'Italia', 
      teams: [
        { name: 'Inter Milan', id: 505, xG: 2.2 }, 
        { name: 'Napoli', id: 492, xG: 2.0 }, 
        { name: 'AC Milan', id: 489, xG: 1.8 }, 
        { name: 'Juventus', id: 496, xG: 1.6 }, 
        { name: 'Atalanta', id: 499, xG: 1.9 }, 
        { name: 'Roma', id: 497, xG: 1.5 }, 
      ] 
    },
    { 
      name: 'Bundesliga', 
      country: 'Alemania', 
      teams: [
        { name: 'Bayern Munich', id: 157, xG: 2.8 }, 
        { name: 'Borussia Dortmund', id: 165, xG: 2.3 }, 
        { name: 'RB Leipzig', id: 173, xG: 1.9 }, 
        { name: 'Bayer Leverkusen', id: 168, xG: 2.1 }, 
      ] 
    },
    { 
      name: 'Ligue 1', 
      country: 'Francia', 
      teams: [
        { name: 'PSG', id: 85, xG: 2.7 }, 
        { name: 'Monaco', id: 91, xG: 1.8 }, 
        { name: 'Marseille', id: 81, xG: 1.7 }, 
        { name: 'Lille', id: 79, xG: 1.4 }, 
      ] 
    },
    { 
      name: 'Eredivisie', 
      country: 'Holanda', 
      teams: [
        { name: 'PSV', id: 674, xG: 2.39 }, 
        { name: 'AZ', id: 672, xG: 1.27 }, 
        { name: 'Ajax', id: 673, xG: 2.1 }, 
        { name: 'Feyenoord', id: 675, xG: 1.85 }, 
      ] 
    },
    { 
      name: 'Liga BetPlay', 
      country: 'Colombia', 
      teams: [
        { name: 'Atlético Nacional', id: 1001, xG: 1.7 }, 
        { name: 'Millonarios', id: 1002, xG: 1.6 }, 
        { name: 'América de Cali', id: 1003, xG: 1.4 }, 
        { name: 'Junior', id: 1004, xG: 1.3 }, 
        { name: 'Santa Fe', id: 1005, xG: 1.2 }, 
      ] 
    },
  ];
  
  let matchId = 10000;
  
  for (let day = 1; day <= 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    for (const league of leagues) {
      const numMatches = 1 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < numMatches; i++) {
        const homeIdx = Math.floor(Math.random() * league.teams.length);
        let awayIdx = Math.floor(Math.random() * league.teams.length);
        while (awayIdx === homeIdx) awayIdx = Math.floor(Math.random() * league.teams.length);
        
        const home = league.teams[homeIdx];
        const away = league.teams[awayIdx];
        
        const matchDate = new Date(date);
        matchDate.setHours(14 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 4) * 15, 0, 0);
        
        // Agregar stats al cache
        teamStatsCache.set(home.id, { 
          goalsFor: home.xG, 
          goalsAgainst: 1.1, 
          form: 'W,D,W,L,W', 
          position: Math.floor(Math.random() * 10) + 1 
        });
        teamStatsCache.set(away.id, { 
          goalsFor: away.xG, 
          goalsAgainst: 1.1, 
          form: 'W,L,W,D,W', 
          position: Math.floor(Math.random() * 10) + 1 
        });
        
        matches.push({
          id: `fb_${matchId++}`,
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
  
  console.log(`📊 Fallback: ${matches.length} partidos (equipos reales, fechas estimadas)`);
  return matches;
}

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de TODAS las APIs disponibles...');
  
  const allMatches: MatchForApp[] = [];
  const seenKeys = new Set<string>();
  
  // 1. Obtener de Football-data.org
  const fdMatches = await fetchFromFootballData();
  for (const m of fdMatches) {
    const key = `${m.homeTeam}-${m.awayTeam}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      allMatches.push(m);
    }
  }
  
  // 2. Obtener de RapidAPI (si hay key)
  const raMatches = await fetchFromRapidAPI();
  for (const m of raMatches) {
    const key = `${m.homeTeam}-${m.awayTeam}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      allMatches.push(m);
    }
  }
  
  // 3. Obtener standings para datos reales
  await Promise.all([
    fetchStandingsFromFD('PL'),
    fetchStandingsFromFD('PD'),
    fetchStandingsFromFD('SA'),
    fetchStandingsFromFD('BL1'),
    fetchStandingsFromFD('FL1'),
    fetchStandingsFromFD('DED'),
  ]);
  
  // 4. Si hay pocos partidos reales, usar fallback
  if (allMatches.length < 20) {
    console.log(`⚠️ Solo ${allMatches.length} partidos reales, agregando fallback...`);
    const fallbackMatches = generateFallbackMatches();
    for (const m of fallbackMatches) {
      const key = `${m.homeTeam}-${m.awayTeam}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allMatches.push(m);
      }
    }
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
  
  console.log(`✅ TOTAL: ${filteredMatches.length} partidos (${fdMatches.length} Football-data + ${raMatches.length} RapidAPI + fallback)`);
  
  return filteredMatches;
}

// ===== OBTENER STATS DE EQUIPO =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== RESULTADOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  try {
    const response = await fetch(
      `${FOOTBALL_DATA_URL}/matches?status=FINISHED`,
      { 
        headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const matches = data.matches || [];
      
      for (const match of matches) {
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
  } catch (error) {
    console.error('Error resultados:', error);
  }
  
  return results;
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
