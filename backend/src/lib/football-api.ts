// API de Fútbol - El Dios Yerson
// Sin límites, sin APIs de pago
// Fuentes: ESPN (LATAM) + football-data.org (Europa)

import * as cheerio from 'cheerio';

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
// football-data.org - Europa
const FD_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '435367d92f8344c887a47200a1f34b13';
const FD_API_URL = 'https://api.football-data.org/v4';

// ESPN - LATAM y otros
const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

console.log('⚽ Fuentes de datos: ESPN (LATAM) + football-data.org (Europa)');

// ===== LIGAS ESPN (LATAM + otras) =====
const ESPN_LEAGUES = [
  // LATAM
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
  // USA/MLS
  { code: 'usa.1', name: 'MLS', country: 'Estados Unidos', priority: 2 },
  // Internacionales
  { code: 'conmebol.libertadores', name: 'Copa Libertadores', country: 'Sudamérica', priority: 1 },
  { code: 'conmebol.sudamericana', name: 'Copa Sudamericana', country: 'Sudamérica', priority: 1 },
];

// ===== COMPETICIONES football-data.org (Europa) =====
const FD_COMPETITIONS = [
  { code: 'PL', name: 'Premier League', country: 'Inglaterra' },
  { code: 'PD', name: 'La Liga', country: 'España' },
  { code: 'SA', name: 'Serie A', country: 'Italia' },
  { code: 'BL1', name: 'Bundesliga', country: 'Alemania' },
  { code: 'FL1', name: 'Ligue 1', country: 'Francia' },
  { code: 'DED', name: 'Eredivisie', country: 'Holanda' },
  { code: 'PPL', name: 'Primeira Liga', country: 'Portugal' },
  { code: 'ELC', name: 'Championship', country: 'Inglaterra' },
  { code: 'CL', name: 'Champions League', country: 'Europa' },
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
  
  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();
  
  try {
    // ===== 1. ESPN - LATAM =====
    console.log('\n🇲🇽🇦🇷🇧🇷 Obteniendo ligas LATAM de ESPN...');
    
    for (const league of ESPN_LEAGUES) {
      await new Promise(r => setTimeout(r, 100)); // Rate limit
      
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
          // Solo partidos no terminados
          if (event.status?.type?.completed) continue;
          
          const matchId = `espn_${event.id}`;
          if (seenIds.has(matchId)) continue;
          seenIds.add(matchId);
          
          const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home');
          const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away');
          
          allMatches.push({
            id: matchId,
            homeTeam: homeTeam?.team?.displayName || 'TBD',
            awayTeam: awayTeam?.team?.displayName || 'TBD',
            league: league.name,
            country: league.country,
            matchDate: event.date,
            status: event.status?.type?.shortDetail || 'Scheduled',
            homeLogo: homeTeam?.team?.logo,
            awayLogo: awayTeam?.team?.logo,
            leagueLogo: data.leagues?.[0]?.logos?.[0]?.href,
            homeTeamId: parseInt(homeTeam?.team?.id || '0'),
            awayTeamId: parseInt(awayTeam?.team?.id || '0'),
          });
        }
        
        if (events.length > 0) {
          console.log(`  ✅ ${league.name} (${league.country}): ${events.length} partidos`);
        }
      } catch (error) {
        // Silencioso
      }
    }
    
    // ===== 2. football-data.org - Europa =====
    console.log('\n🇪🇺 Obteniendo ligas Europeas de football-data.org...');
    
    const today = new Date();
    const fromDate = today.toISOString().split('T')[0];
    const toDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Endpoint general
    try {
      const matchesResponse = await fetch(
        `${FD_API_URL}/matches?dateFrom=${fromDate}&dateTo=${toDate}`,
        {
          headers: { 'X-Auth-Token': FD_API_KEY },
          signal: AbortSignal.timeout(20000)
        }
      );
      
      if (matchesResponse.ok) {
        const data = await matchesResponse.json();
        const matches = data.matches || [];
        
        for (const match of matches) {
          if (match.status === 'FINISHED' || match.status === 'CANCELLED') continue;
          
          const matchId = `fd_${match.id}`;
          if (seenIds.has(matchId)) continue;
          seenIds.add(matchId);
          
          const compInfo = FD_COMPETITIONS.find(c => c.code === match.competition?.code);
          
          allMatches.push({
            id: matchId,
            homeTeam: match.homeTeam?.name || 'TBD',
            awayTeam: match.awayTeam?.name || 'TBD',
            league: match.competition?.name || compInfo?.name || 'Liga',
            country: compInfo?.country || match.area?.name || 'Internacional',
            matchDate: match.utcDate,
            status: match.status,
            homeLogo: match.homeTeam?.crest,
            awayLogo: match.awayTeam?.crest,
            leagueLogo: match.competition?.emblem,
            homeTeamId: match.homeTeam?.id,
            awayTeamId: match.awayTeam?.id,
          });
        }
        
        console.log(`  ✅ Europa: ${matches.length} partidos`);
      }
    } catch (error) {
      console.log('  ❌ Error Europa:', error);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
  
  // Ordenar: LATAM primero, luego por fecha
  allMatches.sort((a, b) => {
    // Prioridad LATAM
    const aIsLATAM = ['Colombia', 'Argentina', 'Brasil', 'México', 'Chile', 'Ecuador', 'Perú', 'Uruguay', 'Paraguay', 'Venezuela', 'Sudamérica'].includes(a.country);
    const bIsLATAM = ['Colombia', 'Argentina', 'Brasil', 'México', 'Chile', 'Ecuador', 'Perú', 'Uruguay', 'Paraguay', 'Venezuela', 'Sudamérica'].includes(b.country);
    
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
  
  // Log resumen
  const latamCount = filteredMatches.filter(m => ['Colombia', 'Argentina', 'Brasil', 'México', 'Chile', 'Ecuador', 'Perú', 'Uruguay', 'Paraguay', 'Venezuela', 'Sudamérica'].includes(m.country)).length;
  const europaCount = filteredMatches.length - latamCount;
  
  console.log(`\n✅ TOTAL: ${filteredMatches.length} partidos`);
  console.log(`   🌎 LATAM: ${latamCount}`);
  console.log(`   🇪🇺 Europa: ${europaCount}`);
  
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
  
  // Buscar en ESPN
  for (const league of ESPN_LEAGUES.slice(0, 5)) {
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
        
        const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home');
        const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away');
        
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
