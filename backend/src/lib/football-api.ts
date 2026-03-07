// API de Fútbol - El Dios Yerson
// Usa api-sports.io (API-Football) - TODAS las ligas incluido LATAM

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

// ===== API: API-SPORTS.IO (API-FOOTBALL) =====
const API_KEY = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY || '1b61538134ffc3ee9b7f637ceebe7524';
const API_URL = 'https://v3.football.api-sports.io';

console.log('🔑 API-FOOTBALL KEY:', API_KEY ? '✅ Configurada' : '❌ No configurada');

// ===== TODAS LAS LIGAS INCLUYENDO LATAM =====
const LEAGUES = [
  // 🇨🇴 COLOMBIA
  { id: 239, name: 'Liga BetPlay', country: 'Colombia', priority: 1 },
  
  // 🇦🇷 ARGENTINA
  { id: 128, name: 'Liga Profesional Argentina', country: 'Argentina', priority: 1 },
  
  // 🇧🇷 BRASIL
  { id: 71, name: 'Brasileirão', country: 'Brasil', priority: 1 },
  { id: 73, name: 'Brasileirão Série B', country: 'Brasil', priority: 2 },
  
  // 🇲🇽 MÉXICO
  { id: 262, name: 'Liga MX', country: 'México', priority: 1 },
  
  // 🇨🇱 CHILE
  { id: 265, name: 'Primera División Chile', country: 'Chile', priority: 1 },
  
  // 🇪🇨 ECUADOR
  { id: 242, name: 'Liga Pro Ecuador', country: 'Ecuador', priority: 1 },
  
  // 🇵🇪 PERÚ
  { id: 249, name: 'Liga 1 Perú', country: 'Perú', priority: 1 },
  
  // 🇺🇾 URUGUAY
  { id: 274, name: 'Primera División Uruguay', country: 'Uruguay', priority: 1 },
  
  // 🇵🇾 PARAGUAY
  { id: 250, name: 'Primera División Paraguay', country: 'Paraguay', priority: 1 },
  
  // 🇻🇪 VENEZUELA
  { id: 277, name: 'Primera División Venezuela', country: 'Venezuela', priority: 1 },
  
  // 🌎 COPAS SUDAMERICANAS
  { id: 13, name: 'Copa Libertadores', country: 'Sudamérica', priority: 1 },
  { id: 11, name: 'Copa Sudamericana', country: 'Sudamérica', priority: 1 },
  
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 EUROPA TOP
  { id: 39, name: 'Premier League', country: 'Inglaterra', priority: 2 },
  { id: 140, name: 'La Liga', country: 'España', priority: 2 },
  { id: 135, name: 'Serie A', country: 'Italia', priority: 2 },
  { id: 78, name: 'Bundesliga', country: 'Alemania', priority: 2 },
  { id: 61, name: 'Ligue 1', country: 'Francia', priority: 2 },
  { id: 88, name: 'Eredivisie', country: 'Holanda', priority: 2 },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', priority: 2 },
  
  // 🏆 CHAMPIONS
  { id: 2, name: 'Champions League', country: 'Europa', priority: 2 },
];

// ===== OBTENER PARTIDOS DE UNA LIGA =====
async function fetchLeagueMatches(leagueId: number, leagueName: string, country: string): Promise<MatchForApp[]> {
  const matches: MatchForApp[] = [];
  
  try {
    const season = new Date().getFullYear();
    
    const response = await fetch(
      `${API_URL}/fixtures?league=${leagueId}&season=${season}`,
      {
        headers: {
          'x-apisports-key': API_KEY,
        },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (!response.ok) {
      console.log(`⚠️ Liga ${leagueId}: ${response.status}`);
      return matches;
    }
    
    const data = await response.json();
    const fixtures = data.response || [];
    
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    
    for (const fixture of fixtures) {
      // Solo partidos programados
      if (!['NS', 'TBD'].includes(fixture.fixture?.status?.short)) continue;
      
      const matchDate = new Date(fixture.fixture?.date);
      
      // Solo próximos 14 días
      if (matchDate < now || matchDate > maxDate) continue;
      
      matches.push({
        id: `as_${fixture.fixture.id}`,
        homeTeam: fixture.teams?.home?.name || 'TBD',
        awayTeam: fixture.teams?.away?.name || 'TBD',
        league: leagueName,
        country: country,
        matchDate: fixture.fixture?.date,
        status: 'NS',
        homeLogo: fixture.teams?.home?.logo,
        awayLogo: fixture.teams?.away?.logo,
        leagueLogo: fixture.league?.logo,
        homeTeamId: fixture.teams?.home?.id,
        awayTeamId: fixture.teams?.away?.id,
      });
    }
    
    if (matches.length > 0) {
      console.log(`✅ ${leagueName} (${country}): ${matches.length} partidos`);
    }
    
  } catch (error) {
    // Silencioso
  }
  
  return matches;
}

// ===== OBTENER STANDINGS =====
async function fetchLeagueStandings(leagueId: number): Promise<void> {
  try {
    const season = new Date().getFullYear();
    
    const response = await fetch(
      `${API_URL}/standings?league=${leagueId}&season=${season}`,
      {
        headers: {
          'x-apisports-key': API_KEY,
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (!response.ok) return;
    
    const data = await response.json();
    const table = data.response?.[0]?.league?.standings?.[0];
    
    if (table) {
      for (const row of table) {
        const games = Math.max(1, row.games?.played || row.all?.played || 1);
        teamStatsCache.set(row.team.id, {
          goalsFor: Math.round(((row.all?.goals?.for || row.goalsFor || 0) / games) * 100) / 100,
          goalsAgainst: Math.round(((row.all?.goals?.against || row.goalsAgainst || 0) / games) * 100) / 100,
          form: row.form || 'W,D,W,L,W',
          position: row.rank,
        });
      }
    }
  } catch (error) {
    // Silencioso
  }
}

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de api-sports.io...');
  console.log('📡 Buscando en', LEAGUES.length, 'ligas...');
  
  const allMatches: MatchForApp[] = [];
  const seenKeys = new Set<string>();
  
  // Prioridad 1: LATAM
  const latamLeagues = LEAGUES.filter(l => l.priority === 1);
  const europaLeagues = LEAGUES.filter(l => l.priority === 2);
  
  // Obtener LATAM primero
  for (const league of latamLeagues) {
    const matches = await fetchLeagueMatches(league.id, league.name, league.country);
    for (const m of matches) {
      const key = `${m.homeTeam}-${m.awayTeam}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allMatches.push(m);
      }
    }
    await fetchLeagueStandings(league.id);
    await new Promise(r => setTimeout(r, 350)); // Rate limit: ~3 req/sec
  }
  
  // Obtener Europa después
  for (const league of europaLeagues) {
    const matches = await fetchLeagueMatches(league.id, league.name, league.country);
    for (const m of matches) {
      const key = `${m.homeTeam}-${m.awayTeam}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allMatches.push(m);
      }
    }
    await fetchLeagueStandings(league.id);
    await new Promise(r => setTimeout(r, 350));
  }
  
  // Ordenar por fecha
  allMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  
  // Filtrar por rango
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

// ===== OBTENER STATS =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== RESULTADOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  try {
    for (const league of LEAGUES.slice(0, 5)) {
      const season = new Date().getFullYear();
      
      const response = await fetch(
        `${API_URL}/fixtures?league=${league.id}&season=${season}&status=FT`,
        {
          headers: {
            'x-apisports-key': API_KEY,
          },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (!response.ok) continue;
      
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
      
      await new Promise(r => setTimeout(r, 350));
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
