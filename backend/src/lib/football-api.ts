// API de Fútbol - El Dios Yerson
// Usa api-sports.io (API-Football) - Plan GRATIS funciona con temporadas 2022-2024

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

// Cache de estadísticas
const teamStatsCache = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();

// ===== API: API-SPORTS.IO =====
const API_KEY = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY || '1b61538134ffc3ee9b7f637ceebe7524';
const API_URL = 'https://v3.football.api-sports.io';

console.log('🔑 API-FOOTBALL KEY:', API_KEY ? '✅ Configurada' : '❌ No configurada');

// ===== LIGAS DISPONIBLES EN PLAN GRATIS =====
const LEAGUES_LATAM = [
  { id: 239, name: 'Liga BetPlay', country: 'Colombia' },
  { id: 128, name: 'Liga Argentina', country: 'Argentina' },
  { id: 71, name: 'Brasileirão', country: 'Brasil' },
  { id: 262, name: 'Liga MX', country: 'México' },
  { id: 265, name: 'Primera Chile', country: 'Chile' },
  { id: 242, name: 'Liga Pro', country: 'Ecuador' },
  { id: 249, name: 'Liga 1', country: 'Perú' },
  { id: 274, name: 'Primera Uruguay', country: 'Uruguay' },
  { id: 13, name: 'Copa Libertadores', country: 'Sudamérica' },
  { id: 11, name: 'Copa Sudamericana', country: 'Sudamérica' },
];

const LEAGUES_EUROPA = [
  { id: 39, name: 'Premier League', country: 'Inglaterra' },
  { id: 140, name: 'La Liga', country: 'España' },
  { id: 135, name: 'Serie A', country: 'Italia' },
  { id: 78, name: 'Bundesliga', country: 'Alemania' },
  { id: 61, name: 'Ligue 1', country: 'Francia' },
  { id: 88, name: 'Eredivisie', country: 'Holanda' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal' },
  { id: 2, name: 'Champions League', country: 'Europa' },
];

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de api-sports.io...');
  
  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();
  
  try {
    // 1. Obtener próximos 50 partidos (endpoint general)
    const nextResponse = await fetch(
      `${API_URL}/fixtures?next=50`,
      {
        headers: { 'x-apisports-key': API_KEY },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (nextResponse.ok) {
      const data = await nextResponse.json();
      const fixtures = data.response || [];
      
      for (const fixture of fixtures) {
        const matchId = `as_${fixture.fixture.id}`;
        if (seenIds.has(matchId)) continue;
        seenIds.add(matchId);
        
        allMatches.push({
          id: matchId,
          homeTeam: fixture.teams?.home?.name || 'TBD',
          awayTeam: fixture.teams?.away?.name || 'TBD',
          league: fixture.league?.name || 'Liga',
          country: fixture.league?.country || 'Internacional',
          matchDate: fixture.fixture?.date,
          status: fixture.fixture?.status?.short || 'NS',
          homeLogo: fixture.teams?.home?.logo,
          awayLogo: fixture.teams?.away?.logo,
          leagueLogo: fixture.league?.logo,
          homeTeamId: fixture.teams?.home?.id,
          awayTeamId: fixture.teams?.away?.id,
        });
      }
      
      console.log(`✅ Próximos partidos: ${fixtures.length}`);
    }
    
    // 2. Obtener partidos en vivo
    const liveResponse = await fetch(
      `${API_URL}/fixtures?live=all`,
      {
        headers: { 'x-apisports-key': API_KEY },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (liveResponse.ok) {
      const data = await liveResponse.json();
      const fixtures = data.response || [];
      
      for (const fixture of fixtures) {
        const matchId = `as_${fixture.fixture.id}`;
        if (seenIds.has(matchId)) continue;
        seenIds.add(matchId);
        
        allMatches.push({
          id: matchId,
          homeTeam: fixture.teams?.home?.name || 'TBD',
          awayTeam: fixture.teams?.away?.name || 'TBD',
          league: fixture.league?.name || 'Liga',
          country: fixture.league?.country || 'Internacional',
          matchDate: fixture.fixture?.date,
          status: 'LIVE',
          homeLogo: fixture.teams?.home?.logo,
          awayLogo: fixture.teams?.away?.logo,
          leagueLogo: fixture.league?.logo,
          homeTeamId: fixture.teams?.home?.id,
          awayTeamId: fixture.teams?.away?.id,
        });
      }
      
      console.log(`✅ Partidos en vivo: ${fixtures.length}`);
    }
    
    // 3. Buscar en ligas LATAM específicamente (temporada 2024)
    for (const league of LEAGUES_LATAM) {
      await new Promise(r => setTimeout(r, 350)); // Rate limit
      
      const leagueResponse = await fetch(
        `${API_URL}/fixtures?league=${league.id}&season=2024&status=NS`,
        {
          headers: { 'x-apisports-key': API_KEY },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (leagueResponse.ok) {
        const data = await leagueResponse.json();
        const fixtures = data.response || [];
        
        for (const fixture of fixtures) {
          const matchId = `as_${fixture.fixture.id}`;
          if (seenIds.has(matchId)) continue;
          seenIds.add(matchId);
          
          allMatches.push({
            id: matchId,
            homeTeam: fixture.teams?.home?.name || 'TBD',
            awayTeam: fixture.teams?.away?.name || 'TBD',
            league: league.name,
            country: league.country,
            matchDate: fixture.fixture?.date,
            status: 'NS',
            homeLogo: fixture.teams?.home?.logo,
            awayLogo: fixture.teams?.away?.logo,
            leagueLogo: fixture.league?.logo,
            homeTeamId: fixture.teams?.home?.id,
            awayTeamId: fixture.teams?.away?.id,
          });
        }
        
        if (fixtures.length > 0) {
          console.log(`✅ ${league.name}: ${fixtures.length} partidos`);
        }
      }
      
      // Obtener standings
      await fetchStandings(league.id);
    }
    
    // 4. Buscar en ligas Europa
    for (const league of LEAGUES_EUROPA) {
      await new Promise(r => setTimeout(r, 350));
      
      const leagueResponse = await fetch(
        `${API_URL}/fixtures?league=${league.id}&season=2024&status=NS`,
        {
          headers: { 'x-apisports-key': API_KEY },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (leagueResponse.ok) {
        const data = await leagueResponse.json();
        const fixtures = data.response || [];
        
        for (const fixture of fixtures) {
          const matchId = `as_${fixture.fixture.id}`;
          if (seenIds.has(matchId)) continue;
          seenIds.add(matchId);
          
          allMatches.push({
            id: matchId,
            homeTeam: fixture.teams?.home?.name || 'TBD',
            awayTeam: fixture.teams?.away?.name || 'TBD',
            league: league.name,
            country: league.country,
            matchDate: fixture.fixture?.date,
            status: 'NS',
            homeLogo: fixture.teams?.home?.logo,
            awayLogo: fixture.teams?.away?.logo,
            leagueLogo: fixture.league?.logo,
            homeTeamId: fixture.teams?.home?.id,
            awayTeamId: fixture.teams?.away?.id,
          });
        }
        
        if (fixtures.length > 0) {
          console.log(`✅ ${league.name}: ${fixtures.length} partidos`);
        }
      }
      
      await fetchStandings(league.id);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Ordenar por fecha
  allMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  
  // Filtrar próximos 14 días
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
  
  console.log(`✅ TOTAL: ${filteredMatches.length} partidos REALES`);
  
  return filteredMatches;
}

// ===== OBTENER STANDINGS =====
async function fetchStandings(leagueId: number): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/standings?league=${leagueId}&season=2024`,
      {
        headers: { 'x-apisports-key': API_KEY },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (!response.ok) return;
    
    const data = await response.json();
    const table = data.response?.[0]?.league?.standings?.[0];
    
    if (table) {
      for (const row of table) {
        const games = Math.max(1, row.all?.played || 1);
        teamStatsCache.set(row.team.id, {
          goalsFor: Math.round((row.all?.goals?.for || 0) / games * 100) / 100,
          goalsAgainst: Math.round((row.all?.goals?.against || 0) / games * 100) / 100,
          form: row.form || 'W,D,W,L,W',
          position: row.rank,
        });
      }
    }
  } catch (error) {
    // Silencioso
  }
}

// ===== OBTENER STATS =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== RESULTADOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  try {
    const response = await fetch(
      `${API_URL}/fixtures?status=FT`,
      {
        headers: { 'x-apisports-key': API_KEY },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const fixtures = data.response || [];
      
      for (const fixture of fixtures) {
        const matchId = `as_${fixture.fixture.id}`;
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
