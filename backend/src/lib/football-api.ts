// API de Fútbol - El Dios Yerson
// FUENTE PRINCIPAL: football-data.org (datos en tiempo real)
// FUENTE SECUNDARIA: api-sports.io (estadísticas históricas)

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
// football-data.org - Principal (datos en tiempo real)
const FD_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '435367d92f8344c887a47200a1f34b13';
const FD_API_URL = 'https://api.football-data.org/v4';

// api-sports.io - Secundario (estadísticas históricas, plan gratis solo 2022-2024)
const AS_API_KEY = process.env.FOOTBALL_API_KEY || '1b61538134ffc3ee9b7f637ceebe7524';
const AS_API_URL = 'https://v3.football.api-sports.io';

console.log('🔑 football-data.org KEY:', FD_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('🔑 api-sports.io KEY:', AS_API_KEY ? '✅ Configurada' : '❌ No configurada');

// ===== COMPETICIONES football-data.org =====
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
  { code: 'ELC', name: 'Europa League', country: 'Europa' },
  { code: 'BSA', name: 'Brasileirão', country: 'Brasil' },
];

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime() + 30 * 60 * 1000);
  }
  
  console.log('🌐 Obteniendo partidos de football-data.org...');
  
  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();
  
  try {
    // Calcular rango de fechas
    const today = new Date();
    const fromDate = today.toISOString().split('T')[0];
    const toDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Buscando partidos del ${fromDate} al ${toDate}`);
    
    // 1. Obtener TODOS los partidos del rango (endpoint general)
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
      
      console.log(`✅ Total partidos del endpoint general: ${matches.length}`);
      
      for (const match of matches) {
        // Solo partidos no terminados
        if (match.status === 'FINISHED' || match.status === 'CANCELLED') continue;
        
        const matchId = `fd_${match.id}`;
        if (seenIds.has(matchId)) continue;
        seenIds.add(matchId);
        
        // Buscar info de la competición
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
    } else {
      console.log('❌ Error endpoint general:', matchesResponse.status);
    }
    
    // 2. Buscar por competición para asegurar cobertura completa
    for (const comp of FD_COMPETITIONS) {
      await new Promise(r => setTimeout(r, 100)); // Rate limit
      
      const compResponse = await fetch(
        `${FD_API_URL}/competitions/${comp.code}/matches?dateFrom=${fromDate}&dateTo=${toDate}`,
        {
          headers: { 'X-Auth-Token': FD_API_KEY },
          signal: AbortSignal.timeout(15000)
        }
      );
      
      if (compResponse.ok) {
        const data = await compResponse.json();
        const matches = data.matches || [];
        
        for (const match of matches) {
          if (match.status === 'FINISHED' || match.status === 'CANCELLED') continue;
          
          const matchId = `fd_${match.id}`;
          if (seenIds.has(matchId)) continue;
          seenIds.add(matchId);
          
          allMatches.push({
            id: matchId,
            homeTeam: match.homeTeam?.name || 'TBD',
            awayTeam: match.awayTeam?.name || 'TBD',
            league: comp.name,
            country: comp.country,
            matchDate: match.utcDate,
            status: match.status,
            homeLogo: match.homeTeam?.crest,
            awayLogo: match.awayTeam?.crest,
            leagueLogo: match.competition?.emblem,
            homeTeamId: match.homeTeam?.id,
            awayTeamId: match.awayTeam?.id,
          });
        }
        
        if (matches.length > 0) {
          console.log(`✅ ${comp.name}: ${matches.length} partidos`);
        }
      }
    }
    
    // 3. Obtener standings de api-sports.io para estadísticas
    await fetchAllStandings();
    
  } catch (error) {
    console.error('❌ Error:', error);
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
  
  console.log(`✅ TOTAL: ${filteredMatches.length} partidos REALES`);
  
  return filteredMatches;
}

// ===== OBTENER STANDINGS DE API-SPORTS =====
async function fetchAllStandings(): Promise<void> {
  const leagues = [39, 140, 135, 78, 61, 88, 94, 71]; // Principales ligas + Brasil
  
  for (const leagueId of leagues) {
    await new Promise(r => setTimeout(r, 300)); // Rate limit
    
    try {
      const response = await fetch(
        `${AS_API_URL}/standings?league=${leagueId}&season=2024`,
        {
          headers: { 'x-apisports-key': AS_API_KEY },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (!response.ok) continue;
      
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
  
  console.log(`📊 Stats cacheadas para ${teamStatsCache.size} equipos`);
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
    const today = new Date();
    const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    const response = await fetch(
      `${FD_API_URL}/matches?dateFrom=${fromDate}&dateTo=${toDate}&status=FINISHED`,
      {
        headers: { 'X-Auth-Token': FD_API_KEY },
        signal: AbortSignal.timeout(15000)
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
