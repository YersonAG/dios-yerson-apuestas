// API de Fútbol Real - El Dios Yerson
// Usa API-Football (RapidAPI) - Gratis: 100 requests/día
// Esta API tiene MUCHOS más partidos disponibles

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
    venue?: { name: string; city: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals?: {
    home: number | null;
    away: number | null;
  };
}

interface ApiTeamStats {
  team: { id: number; name: string };
  league: { id: number; name: string };
  fixtures: { played: { total: number } };
  goals: {
    for: { total: { total: number }; average: { home: string; away: string } };
    against: { total: { total: number } };
  };
  form?: string;
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

// API-Football (RapidAPI) - Usar FOOTBALL_API_KEY
const API_KEY = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY || 'demo';
const API_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const getHeaders = () => ({
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
});

// Cache
let cachedMatches: MatchForApp[] = [];
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Cache de estadísticas
const teamStatsCache = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();

// Ligas principales a buscar
const MAIN_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'Inglaterra' },
  { id: 140, name: 'La Liga', country: 'España' },
  { id: 135, name: 'Serie A', country: 'Italia' },
  { id: 78, name: 'Bundesliga', country: 'Alemania' },
  { id: 61, name: 'Ligue 1', country: 'Francia' },
  { id: 88, name: 'Eredivisie', country: 'Holanda' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal' },
  { id: 128, name: 'Liga BetPlay', country: 'Colombia' },
  { id: 2, name: 'Champions League', country: 'Europa' },
  { id: 13, name: 'Copa Libertadores', country: 'Sudamérica' },
];

// ===== OBTENER STANDINGS DE UNA LIGA =====
async function fetchStandings(leagueId: number): Promise<void> {
  try {
    const season = new Date().getFullYear();
    const response = await fetch(
      `${API_URL}/standings?league=${leagueId}&season=${season}`,
      { headers: getHeaders(), signal: AbortSignal.timeout(8000) }
    );
    
    if (!response.ok) return;
    
    const data = await response.json();
    const standings = data.response?.[0]?.league?.standings?.[0];
    
    if (standings) {
      for (const row of standings) {
        const games = Math.max(1, row.games?.played || row.all?.played || 1);
        teamStatsCache.set(row.team.id, {
          goalsFor: Math.round(((row.all?.goals?.for || row.goalsFor || 0) / games) * 100) / 100,
          goalsAgainst: Math.round(((row.all?.goals?.against || row.goalsAgainst || 0) / games) * 100) / 100,
          form: row.form || row.description || 'W,D,W,L,W',
          position: row.rank || row.position || 1,
        });
      }
      console.log(`✅ Standings liga ${leagueId}: ${standings.length} equipos`);
    }
  } catch (error) {
    console.log(`⚠️ Error standings liga ${leagueId}`);
  }
}

// ===== OBTENER PARTIDOS PRÓXIMOS =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de API-Football (RapidAPI)...');
  console.log('🔑 API Key:', API_KEY.substring(0, 8) + '...');
  
  try {
    const today = new Date();
    const fromDate = today.toISOString().split('T')[0];
    
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + days);
    const toDateStr = toDate.toISOString().split('T')[0];
    
    // Obtener partidos de las ligas principales
    const allMatches: MatchForApp[] = [];
    
    // 1. Obtener partidos generales (todos los disponibles)
    const generalResponse = await fetch(
      `${API_URL}/fixtures?date=${fromDate}&to=${toDateStr}`,
      { headers: getHeaders(), signal: AbortSignal.timeout(15000) }
    );
    
    if (generalResponse.ok) {
      const data = await generalResponse.json();
      const fixtures: ApiFixture[] = data.response || [];
      
      console.log(`📊 API: ${fixtures.length} partidos totales`);
      
      // Filtrar solo partidos que no han comenzado
      const now = new Date();
      const upcomingFixtures = fixtures.filter(f => {
        const matchDate = new Date(f.fixture.date);
        const status = f.fixture.status.short;
        // NS = Not Started, TBD = To Be Determined
        const isUpcoming = ['NS', 'TBD', 'PENDING'].includes(status);
        const isFuture = matchDate.getTime() > now.getTime() + 30 * 60 * 1000;
        return isUpcoming && isFuture;
      });
      
      console.log(`📊 Partidos futuros: ${upcomingFixtures.length}`);
      
      for (const fixture of upcomingFixtures) {
        // Buscar info de la liga
        const leagueInfo = MAIN_LEAGUES.find(l => l.id === fixture.league.id);
        
        allMatches.push({
          id: `api_${fixture.fixture.id}`,
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          league: fixture.league.name,
          country: fixture.league.country || leagueInfo?.country || 'Internacional',
          matchDate: fixture.fixture.date,
          status: fixture.fixture.status.short,
          homeLogo: fixture.teams.home.logo,
          awayLogo: fixture.teams.away.logo,
          leagueLogo: fixture.league.logo,
          homeTeamId: fixture.teams.home.id,
          awayTeamId: fixture.teams.away.id,
        });
      }
    } else {
      console.log(`⚠️ API respondió: ${generalResponse.status}`);
    }
    
    // 2. Si hay pocas, buscar por cada liga principal
    if (allMatches.length < 30) {
      for (const league of MAIN_LEAGUES.slice(0, 6)) {
        try {
          const leagueResponse = await fetch(
            `${API_URL}/fixtures?league=${league.id}&next=10`,
            { headers: getHeaders(), signal: AbortSignal.timeout(8000) }
          );
          
          if (leagueResponse.ok) {
            const data = await leagueResponse.json();
            const fixtures: ApiFixture[] = data.response || [];
            
            for (const fixture of fixtures) {
              const exists = allMatches.some(m => m.id === `api_${fixture.fixture.id}`);
              if (!exists) {
                allMatches.push({
                  id: `api_${fixture.fixture.id}`,
                  homeTeam: fixture.teams.home.name,
                  awayTeam: fixture.teams.away.name,
                  league: league.name,
                  country: league.country,
                  matchDate: fixture.fixture.date,
                  status: fixture.fixture.status.short,
                  homeLogo: fixture.teams.home.logo,
                  awayLogo: fixture.teams.away.logo,
                  leagueLogo: fixture.league.logo,
                  homeTeamId: fixture.teams.home.id,
                  awayTeamId: fixture.teams.away.id,
                });
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 300)); // Rate limit
        } catch (e) {
          console.log(`⚠️ Error liga ${league.name}`);
        }
      }
    }
    
    // 3. Obtener standings para datos reales
    for (const league of MAIN_LEAGUES.slice(0, 5)) {
      await fetchStandings(league.id);
      await new Promise(r => setTimeout(r, 300));
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
    
    // Si aún hay pocos, usar fallback
    if (filteredMatches.length < 20) {
      console.log('⚠️ Pocos partidos, usando fallback adicional');
      const fallback = generateFallbackMatches(filteredMatches);
      const combined = [...filteredMatches, ...fallback];
      combined.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      cachedMatches = combined;
      return combined;
    }
    
    return filteredMatches;
    
  } catch (error) {
    console.error('❌ Error con API:', error);
    return generateFallbackMatches([]);
  }
}

// ===== OBTENER STATS DE UN EQUIPO =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== FALLBACK =====
function generateFallbackMatches(existingMatches: MatchForApp[]): MatchForApp[] {
  const now = new Date();
  const existingKeys = new Set(existingMatches.map(m => `${m.homeTeam}-${m.awayTeam}`));
  
  const leagues = [
    { name: 'Premier League', country: 'Inglaterra', teams: [
      { name: 'Manchester City', id: 50, xG: 2.5 },
      { name: 'Arsenal', id: 42, xG: 2.2 },
      { name: 'Liverpool', id: 40, xG: 2.3 },
      { name: 'Manchester United', id: 33, xG: 1.7 },
      { name: 'Chelsea', id: 49, xG: 1.6 },
      { name: 'Tottenham', id: 47, xG: 1.8 },
      { name: 'Newcastle', id: 34, xG: 1.5 },
      { name: 'Brighton', id: 51, xG: 1.5 },
    ]},
    { name: 'La Liga', country: 'España', teams: [
      { name: 'Real Madrid', id: 541, xG: 2.4 },
      { name: 'Barcelona', id: 529, xG: 2.2 },
      { name: 'Atlético Madrid', id: 530, xG: 1.7 },
      { name: 'Real Sociedad', id: 548, xG: 1.4 },
      { name: 'Villarreal', id: 533, xG: 1.5 },
      { name: 'Real Betis', id: 543, xG: 1.3 },
    ]},
    { name: 'Serie A', country: 'Italia', teams: [
      { name: 'Inter Milan', id: 505, xG: 2.2 },
      { name: 'Napoli', id: 492, xG: 2.0 },
      { name: 'AC Milan', id: 489, xG: 1.8 },
      { name: 'Juventus', id: 496, xG: 1.6 },
      { name: 'Atalanta', id: 499, xG: 1.9 },
      { name: 'Roma', id: 497, xG: 1.5 },
    ]},
    { name: 'Bundesliga', country: 'Alemania', teams: [
      { name: 'Bayern Munich', id: 157, xG: 2.8 },
      { name: 'Borussia Dortmund', id: 165, xG: 2.3 },
      { name: 'RB Leipzig', id: 173, xG: 1.9 },
      { name: 'Bayer Leverkusen', id: 168, xG: 2.1 },
    ]},
    { name: 'Ligue 1', country: 'Francia', teams: [
      { name: 'PSG', id: 85, xG: 2.7 },
      { name: 'Monaco', id: 91, xG: 1.8 },
      { name: 'Marseille', id: 81, xG: 1.7 },
      { name: 'Lille', id: 79, xG: 1.4 },
    ]},
  ];
  
  const matches: MatchForApp[] = [];
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
        const key = `${home.name}-${away.name}`;
        
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        
        const matchDate = new Date(date);
        matchDate.setHours(14 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 4) * 15, 0, 0);
        
        teamStatsCache.set(home.id, { goalsFor: home.xG, goalsAgainst: 1.1, form: 'W,D,W,L,W', position: Math.floor(Math.random() * 10) + 1 });
        teamStatsCache.set(away.id, { goalsFor: away.xG, goalsAgainst: 1.1, form: 'W,L,W,D,W', position: Math.floor(Math.random() * 10) + 1 });
        
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
  
  console.log(`📊 Fallback adicional: ${matches.length} partidos`);
  return matches;
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
    const today = new Date().toISOString().split('T')[0];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fromDate = threeDaysAgo.toISOString().split('T')[0];
    
    const response = await fetch(
      `${API_URL}/fixtures?date=${fromDate}&to=${today}`,
      { headers: getHeaders(), signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const fixtures: ApiFixture[] = data.response || [];
    const results: MatchResult[] = [];
    
    for (const fixture of fixtures) {
      if (fixture.fixture.status.short === 'FT') {
        const matchId = `api_${fixture.fixture.id}`;
        if (matchIds.includes(matchId)) {
          const homeScore = fixture.goals?.home ?? 0;
          const awayScore = fixture.goals?.away ?? 0;
          
          let winner: 'home' | 'away' | 'draw' = 'draw';
          if (homeScore > awayScore) winner = 'home';
          else if (awayScore > homeScore) winner = 'away';
          
          results.push({
            id: matchId,
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            league: fixture.league.name,
            matchDate: fixture.fixture.date,
            status: 'FT',
            homeScore,
            awayScore,
            winner,
            totalGoals: homeScore + awayScore,
          });
        }
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
