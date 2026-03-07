// API de Fútbol - El Dios Yerson
// 🚀 SIN APIs de pago
// Fuentes: API-Football (partidos futuros) + ESPN (partidos del día)

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

// ===== APIs =====
// API-Football (api-sports.io) - Partidos futuros por fecha
const AS_API_KEY = process.env.FOOTBALL_API_KEY || '1b61538134ffc3ee9b7f637ceebe7524';
const AS_API_URL = 'https://v3.football.api-sports.io';

// ESPN - Partidos del día actual
const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

console.log('⚽ Fuentes: API-Football (futuros) + ESPN (hoy)');

// ===== LIGAS PRINCIPALES (API-Football IDs) =====
const PRIORITY_LEAGUES = [
  // LATAM
  { id: 239, name: 'Liga BetPlay', country: 'Colombia', priority: 1 },
  { id: 128, name: 'Liga Profesional', country: 'Argentina', priority: 1 },
  { id: 71, name: 'Brasileirão', country: 'Brasil', priority: 1 },
  { id: 262, name: 'Liga MX', country: 'México', priority: 1 },
  { id: 133, name: 'Primera División', country: 'Chile', priority: 1 },
  { id: 242, name: 'Liga Pro', country: 'Ecuador', priority: 1 },
  { id: 247, name: 'Liga 1', country: 'Perú', priority: 1 },
  
  // Brasil Estaduales
  { id: 475, name: 'Paulista A1', country: 'Brasil', priority: 1 },
  { id: 629, name: 'Mineiro', country: 'Brasil', priority: 1 },
  { id: 600, name: 'Carioca', country: 'Brasil', priority: 1 },
  { id: 611, name: 'Gaúcho', country: 'Brasil', priority: 1 },
  
  // Copas LATAM
  { id: 13, name: 'Copa Libertadores', country: 'Sudamérica', priority: 1 },
  { id: 11, name: 'Copa Sudamericana', country: 'Sudamérica', priority: 1 },
  
  // Europa Top 5
  { id: 39, name: 'Premier League', country: 'Inglaterra', priority: 2 },
  { id: 140, name: 'La Liga', country: 'España', priority: 2 },
  { id: 135, name: 'Serie A', country: 'Italia', priority: 2 },
  { id: 78, name: 'Bundesliga', country: 'Alemania', priority: 2 },
  { id: 61, name: 'Ligue 1', country: 'Francia', priority: 2 },
  
  // Otras Europa
  { id: 88, name: 'Eredivisie', country: 'Holanda', priority: 3 },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', priority: 3 },
  { id: 144, name: 'Jupiler Pro League', country: 'Bélgica', priority: 3 },
  { id: 203, name: 'Süper Lig', country: 'Turquía', priority: 3 },
  
  // Copas Europa
  { id: 2, name: 'Champions League', country: 'Europa', priority: 2 },
  { id: 3, name: 'Europa League', country: 'Europa', priority: 2 },
  { id: 848, name: 'Conference League', country: 'Europa', priority: 3 },
  { id: 45, name: 'FA Cup', country: 'Inglaterra', priority: 2 },
  
  // Otros
  { id: 253, name: 'MLS', country: 'Estados Unidos', priority: 2 },
  { id: 307, name: 'Saudi Pro League', country: 'Arabia Saudita', priority: 3 },
];

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de múltiples fuentes...');
  const startTime = Date.now();
  
  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();
  
  try {
    // ===== 1. API-Football: Obtener partidos de los próximos días =====
    console.log('\n📊 API-Football: Buscando partidos futuros...');
    
    // Crear peticiones para cada día
    const dateRequests: Promise<{ date: string; data: any }>[] = [];
    
    for (let i = 0; i < days; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      dateRequests.push(
        fetch(`${AS_API_URL}/fixtures?date=${dateStr}`, {
          headers: { 'x-apisports-key': AS_API_KEY },
          signal: AbortSignal.timeout(15000)
        })
        .then(r => r.json())
        .then(data => ({ date: dateStr, data }))
        .catch(() => ({ date: dateStr, data: { response: [] } }))
      );
    }
    
    // Ejecutar todas las peticiones en paralelo
    const responses = await Promise.all(dateRequests);
    
    // Procesar respuestas
    const leagueSet = new Set(PRIORITY_LEAGUES.map(l => l.id));
    
    for (const { date, data } of responses) {
      const fixtures = data.response || [];
      
      for (const fixture of fixtures) {
        // Solo ligas prioritarias
        if (!leagueSet.has(fixture.league?.id)) continue;
        
        const matchId = `af_${fixture.fixture?.id}`;
        if (seenIds.has(matchId)) continue;
        seenIds.add(matchId);
        
        // Solo partidos no terminados
        const status = fixture.fixture?.status?.short;
        if (['FT', 'AET', 'PEN', 'CANC', 'PST', 'SUSP'].includes(status)) continue;
        
        const leagueInfo = PRIORITY_LEAGUES.find(l => l.id === fixture.league?.id);
        
        allMatches.push({
          id: matchId,
          homeTeam: fixture.teams?.home?.name || 'TBD',
          awayTeam: fixture.teams?.away?.name || 'TBD',
          league: leagueInfo?.name || fixture.league?.name || 'Liga',
          country: leagueInfo?.country || fixture.league?.country || 'Internacional',
          matchDate: fixture.fixture?.date,
          status: status === 'NS' ? 'Scheduled' : status === 'LIVE' || status === '1H' || status === '2H' ? 'LIVE' : status,
          homeLogo: fixture.teams?.home?.logo,
          awayLogo: fixture.teams?.away?.logo,
          leagueLogo: fixture.league?.logo,
          homeTeamId: fixture.teams?.home?.id,
          awayTeamId: fixture.teams?.away?.id,
        });
      }
      
      if (fixtures.length > 0) {
        const count = fixtures.filter((f: any) => leagueSet.has(f.league?.id) && !['FT', 'AET', 'PEN', 'CANC', 'PST', 'SUSP'].includes(f.fixture?.status?.short)).length;
        if (count > 0) {
          console.log(`  ✅ ${date}: ${count} partidos`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error API-Football:', error);
  }
  
  // ===== 2. ESPN: Partidos de hoy (backup) =====
  try {
    console.log('\n📺 ESPN: Buscando partidos de hoy...');
    
    const espnLeagues = ['col.1', 'mex.1', 'arg.1', 'bra.1', 'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1'];
    
    const espnRequests = espnLeagues.map(async (code) => {
      try {
        const r = await fetch(`${ESPN_API}/${code}/scoreboard`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000)
        });
        const data = await r.json();
        return { code, events: data.events || [] };
      } catch {
        return { code, events: [] };
      }
    });
    
    const espnResults = await Promise.all(espnRequests);
    
    for (const { code, events } of espnResults) {
      for (const event of events) {
        if (event.status?.type?.completed) continue;
        
        const matchId = `espn_${event.id}`;
        if (seenIds.has(matchId)) continue;
        seenIds.add(matchId);
        
        const home = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home');
        const away = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away');
        
        // Determinar liga y país
        let league = 'Liga';
        let country = 'Internacional';
        if (code.includes('col')) { league = 'Liga BetPlay'; country = 'Colombia'; }
        else if (code.includes('mex')) { league = 'Liga MX'; country = 'México'; }
        else if (code.includes('arg')) { league = 'Liga Profesional'; country = 'Argentina'; }
        else if (code.includes('bra')) { league = 'Brasileirão'; country = 'Brasil'; }
        else if (code.includes('eng')) { league = 'Premier League'; country = 'Inglaterra'; }
        else if (code.includes('esp')) { league = 'La Liga'; country = 'España'; }
        else if (code.includes('ita')) { league = 'Serie A'; country = 'Italia'; }
        else if (code.includes('ger')) { league = 'Bundesliga'; country = 'Alemania'; }
        else if (code.includes('fra')) { league = 'Ligue 1'; country = 'Francia'; }
        
        allMatches.push({
          id: matchId,
          homeTeam: home?.team?.displayName || 'TBD',
          awayTeam: away?.team?.displayName || 'TBD',
          league,
          country,
          matchDate: event.date,
          status: event.status?.type?.state === 'in' ? 'LIVE' : 'Scheduled',
          homeLogo: home?.team?.logo,
          awayLogo: away?.team?.logo,
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error ESPN:', error);
  }
  
  // Ordenar por fecha
  allMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  
  // Filtrar próximos días
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
  
  const elapsed = Date.now() - startTime;
  console.log(`\n✅ TOTAL: ${filteredMatches.length} partidos en ${(elapsed/1000).toFixed(1)}s`);
  
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
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await fetch(
      `${AS_API_URL}/fixtures?date=${today}`,
      { headers: { 'x-apisports-key': AS_API_KEY } }
    );
    
    const data = await response.json();
    const fixtures = data.response || [];
    
    for (const fixture of fixtures) {
      const matchId = `af_${fixture.fixture?.id}`;
      if (!matchIds.includes(matchId)) continue;
      
      const status = fixture.fixture?.status?.short;
      if (!['FT', 'AET', 'PEN'].includes(status)) continue;
      
      const homeScore = fixture.goals?.home ?? 0;
      const awayScore = fixture.goals?.away ?? 0;
      
      let winner: 'home' | 'away' | 'draw' = 'draw';
      if (homeScore > awayScore) winner = 'home';
      else if (awayScore > homeScore) winner = 'away';
      
      results.push({
        id: matchId,
        homeTeam: fixture.teams?.home?.name || 'TBD',
        awayTeam: fixture.teams?.away?.name || 'TBD',
        league: fixture.league?.name || 'Liga',
        matchDate: fixture.fixture?.date,
        status: 'FT',
        homeScore,
        awayScore,
        winner,
        totalGoals: homeScore + awayScore,
      });
    }
  } catch (error) {
    console.error('Error resultados:', error);
  }
  
  return results;
}

// ===== EVALUAR PICK =====
export function evaluatePickResult(pick: string, homeScore: number, awayScore: number): 'won' | 'lost' {
  const totalGoals = homeScore + awayScore;
  const normalizedPick = pick.toLowerCase().trim();
  
  if (normalizedPick.includes('1x') || normalizedPick.includes('gana o empata (1x)')) {
    return (homeScore >= awayScore) ? 'won' : 'lost';
  }
  if (normalizedPick.includes('x2') || normalizedPick.includes('gana o empata (x2)')) {
    return (awayScore >= homeScore) ? 'won' : 'lost';
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
