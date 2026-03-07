// API de Fútbol - El Dios Yerson
// 🚫 SIN APIs de pago - Solo ESPN ( GRATIS y sin límites)
// Incluye: TODAS las ligas LATAM + Europa + Internacionales

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

// ===== ESPN API =====
const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

console.log('⚽ Fuente de datos: ESPN (GRATIS, sin límites, todas las ligas)');

// ===== TODAS LAS LIGAS ESPN =====
const ESPN_LEAGUES = [
  // ===== LATAM (Prioridad 1) =====
  { code: 'col.1', name: 'Liga BetPlay', country: 'Colombia', priority: 1 },
  { code: 'arg.1', name: 'Liga Profesional', country: 'Argentina', priority: 1 },
  { code: 'bra.1', name: 'Brasileirão', country: 'Brasil', priority: 1 },
  { code: 'mex.1', name: 'Liga MX', country: 'México', priority: 1 },
  { code: 'chi.1', name: 'Primera División', country: 'Chile', priority: 1 },
  { code: 'ecu.1', name: 'Liga Pro', country: 'Ecuador', priority: 1 },
  { code: 'per.1', name: 'Liga 1', country: 'Perú', priority: 1 },
  { code: 'uru.1', name: 'Primera División', country: 'Uruguay', priority: 1 },
  { code: 'par.1', name: 'Primera División', country: 'Paraguay', priority: 1 },
  { code: 'ven.1', name: 'Primera División', country: 'Venezuela', priority: 1 },
  { code: 'bol.1', name: 'Primera División', country: 'Bolivia', priority: 1 },
  
  // ===== Copas Sudamericanas =====
  { code: 'conmebol.libertadores', name: 'Copa Libertadores', country: 'Sudamérica', priority: 1 },
  { code: 'conmebol.sudamericana', name: 'Copa Sudamericana', country: 'Sudamérica', priority: 1 },
  { code: 'conmebol.recopa', name: 'Recopa Sudamericana', country: 'Sudamérica', priority: 1 },
  
  // ===== Europa - Top 5 =====
  { code: 'eng.1', name: 'Premier League', country: 'Inglaterra', priority: 2 },
  { code: 'esp.1', name: 'La Liga', country: 'España', priority: 2 },
  { code: 'ita.1', name: 'Serie A', country: 'Italia', priority: 2 },
  { code: 'ger.1', name: 'Bundesliga', country: 'Alemania', priority: 2 },
  { code: 'fra.1', name: 'Ligue 1', country: 'Francia', priority: 2 },
  
  // ===== Europa - Otras ligas =====
  { code: 'ned.1', name: 'Eredivisie', country: 'Holanda', priority: 3 },
  { code: 'por.1', name: 'Primeira Liga', country: 'Portugal', priority: 3 },
  { code: 'bel.1', name: 'First Division A', country: 'Bélgica', priority: 3 },
  { code: 'tur.1', name: 'Super Lig', country: 'Turquía', priority: 3 },
  { code: 'sco.1', name: 'Scottish Premiership', country: 'Escocia', priority: 3 },
  { code: 'gre.1', name: 'Super League', country: 'Grecia', priority: 3 },
  
  // ===== Copas Europeas =====
  { code: 'uefa.champions', name: 'Champions League', country: 'Europa', priority: 2 },
  { code: 'uefa.europa', name: 'Europa League', country: 'Europa', priority: 2 },
  { code: 'uefa.europa.conf', name: 'Conference League', country: 'Europa', priority: 3 },
  
  // ===== Otras regiones =====
  { code: 'usa.1', name: 'MLS', country: 'Estados Unidos', priority: 2 },
  { code: 'mex.1', name: 'Liga MX', country: 'México', priority: 1 },
  { code: 'sau.1', name: 'Saudi Pro League', country: 'Arabia Saudita', priority: 3 },
];

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo TODOS los partidos de ESPN...');
  
  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();
  
  for (const league of ESPN_LEAGUES) {
    await new Promise(r => setTimeout(r, 80)); // Pequeño delay para no saturar
    
    try {
      const response = await fetch(
        `${ESPN_API}/${league.code}/scoreboard`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const events = data.events || [];
      
      for (const event of events) {
        // Saltar partidos ya terminados
        if (event.status?.type?.completed === true) continue;
        
        const matchId = `espn_${event.id}`;
        if (seenIds.has(matchId)) continue;
        seenIds.add(matchId);
        
        const competition = event.competitions?.[0];
        const homeTeam = competition?.competitors?.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition?.competitors?.find((c: any) => c.homeAway === 'away');
        
        // Determinar estado
        let status = 'Scheduled';
        if (event.status?.type?.state === 'in') {
          status = 'LIVE';
        } else if (event.status?.type?.completed) {
          status = 'FT';
        } else if (event.status?.type?.shortDetail) {
          status = event.status.type.shortDetail;
        }
        
        allMatches.push({
          id: matchId,
          homeTeam: homeTeam?.team?.displayName || homeTeam?.team?.name || 'TBD',
          awayTeam: awayTeam?.team?.displayName || awayTeam?.team?.name || 'TBD',
          league: league.name,
          country: league.country,
          matchDate: event.date,
          status,
          homeLogo: homeTeam?.team?.logo || homeTeam?.team?.logoHref,
          awayLogo: awayTeam?.team?.logo || awayTeam?.team?.logoHref,
          leagueLogo: data.leagues?.[0]?.logos?.[0]?.href,
          homeTeamId: parseInt(homeTeam?.team?.id || '0'),
          awayTeamId: parseInt(awayTeam?.team?.id || '0'),
        });
      }
      
      if (events.length > 0) {
        const upcoming = events.filter((e: any) => !e.status?.type?.completed).length;
        console.log(`  ✅ ${league.name}: ${upcoming} próximos`);
      }
      
    } catch (error) {
      // Silencioso - continuar con siguiente liga
    }
  }
  
  // Ordenar: LATAM primero, luego por prioridad, luego por fecha
  const paisesLATAM = ['Colombia', 'Argentina', 'Brasil', 'México', 'Chile', 'Ecuador', 'Perú', 'Uruguay', 'Paraguay', 'Venezuela', 'Bolivia', 'Sudamérica'];
  
  allMatches.sort((a, b) => {
    // LATAM primero
    const aIsLATAM = paisesLATAM.includes(a.country);
    const bIsLATAM = paisesLATAM.includes(b.country);
    if (aIsLATAM && !bIsLATAM) return -1;
    if (!aIsLATAM && bIsLATAM) return 1;
    
    // Luego por fecha
    return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
  });
  
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
  
  // Log resumen por región
  const latam = filteredMatches.filter(m => paisesLATAM.includes(m.country)).length;
  const europa = filteredMatches.filter(m => ['Inglaterra', 'España', 'Italia', 'Alemania', 'Francia', 'Holanda', 'Portugal', 'Bélgica', 'Turquía', 'Escocia', 'Grecia', 'Europa'].includes(m.country)).length;
  const otros = filteredMatches.length - latam - europa;
  
  console.log(`\n✅ TOTAL: ${filteredMatches.length} partidos`);
  console.log(`   🌎 LATAM: ${latam}`);
  console.log(`   🇪🇺 Europa: ${europa}`);
  console.log(`   🌍 Otros: ${otros}`);
  
  return filteredMatches;
}

// ===== OBTENER STATS =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== RESULTADOS DE PARTIDOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  for (const league of ESPN_LEAGUES) {
    try {
      const response = await fetch(
        `${ESPN_API}/${league.code}/scoreboard`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const events = data.events || [];
      
      for (const event of events) {
        const matchId = `espn_${event.id}`;
        if (!matchIds.includes(matchId)) continue;
        if (!event.status?.type?.completed) continue;
        
        const competition = event.competitions?.[0];
        const homeTeam = competition?.competitors?.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition?.competitors?.find((c: any) => c.homeAway === 'away');
        
        const homeScore = parseInt(homeTeam?.score || '0');
        const awayScore = parseInt(awayTeam?.score || '0');
        
        let winner: 'home' | 'away' | 'draw' = 'draw';
        if (homeScore > awayScore) winner = 'home';
        else if (awayScore > homeScore) winner = 'away';
        
        results.push({
          id: matchId,
          homeTeam: homeTeam?.team?.displayName || 'TBD',
          awayTeam: awayTeam?.team?.displayName || 'TBD',
          league: league.name,
          matchDate: event.date,
          status: 'FT',
          homeScore,
          awayScore,
          winner,
          totalGoals: homeScore + awayScore,
        });
      }
    } catch (error) {
      // Silencioso
    }
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
