// API de Fútbol - El Dios Yerson
// Usa football-data.org API

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

// ===== API: FOOTBALL-DATA.ORG =====
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '435367d92f8344c887a47200a1f34b13';
const API_URL = 'https://api.football-data.org/v4';

console.log('🔑 FOOTBALL_DATA_API_KEY:', API_KEY ? '✅ Configurada' : '❌ No configurada');

// ===== COMPETICIONES A BUSCAR =====
const COMPETITIONS = [
  { code: 'PL', name: 'Premier League', country: 'Inglaterra' },
  { code: 'PD', name: 'La Liga', country: 'España' },
  { code: 'SA', name: 'Serie A', country: 'Italia' },
  { code: 'BL1', name: 'Bundesliga', country: 'Alemania' },
  { code: 'FL1', name: 'Ligue 1', country: 'Francia' },
  { code: 'DED', name: 'Eredivisie', country: 'Holanda' },
  { code: 'PPL', name: 'Primeira Liga', country: 'Portugal' },
  { code: 'CL', name: 'Champions League', country: 'Europa' },
  { code: 'CLI', name: 'Copa Libertadores', country: 'Sudamérica' },
];

// ===== OBTENER PARTIDOS DE UNA LIGA =====
async function fetchMatchesFromCompetition(code: string, name: string, country: string): Promise<MatchForApp[]> {
  const matches: MatchForApp[] = [];
  
  try {
    const response = await fetch(
      `${API_URL}/competitions/${code}/matches?status=SCHEDULED`,
      { 
        headers: { 'X-Auth-Token': API_KEY },
        signal: AbortSignal.timeout(8000)
      }
    );
    
    if (!response.ok) {
      console.log(`⚠️ ${code}: ${response.status}`);
      return matches;
    }
    
    const data = await response.json();
    const apiMatches = data.matches || [];
    
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    
    for (const match of apiMatches) {
      const matchDate = new Date(match.utcDate);
      
      // Solo partidos en los próximos 14 días
      if (matchDate < now || matchDate > maxDate) continue;
      
      matches.push({
        id: `fd_${match.id}`,
        homeTeam: match.homeTeam?.name || 'TBD',
        awayTeam: match.awayTeam?.name || 'TBD',
        league: name,
        country: country,
        matchDate: match.utcDate,
        status: 'NS',
        homeLogo: match.homeTeam?.crest,
        awayLogo: match.awayTeam?.crest,
        leagueLogo: match.competition?.emblem,
        homeTeamId: match.homeTeam?.id,
        awayTeamId: match.awayTeam?.id,
      });
    }
    
    console.log(`✅ ${name}: ${matches.length} partidos`);
    
  } catch (error) {
    console.log(`⚠️ Error ${code}:`, error);
  }
  
  return matches;
}

// ===== OBTENER STANDINGS =====
async function fetchStandings(code: string): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/competitions/${code}/standings`,
      { 
        headers: { 'X-Auth-Token': API_KEY },
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
      console.log(`📊 Standings ${code}: ${table.length} equipos`);
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
  
  console.log('🌐 Obteniendo partidos de football-data.org...');
  console.log('📡 Buscando en', COMPETITIONS.length, 'ligas...');
  
  const allMatches: MatchForApp[] = [];
  
  // Obtener partidos de cada liga
  for (const comp of COMPETITIONS) {
    const matches = await fetchMatchesFromCompetition(comp.code, comp.name, comp.country);
    allMatches.push(...matches);
    
    // Obtener standings también
    await fetchStandings(comp.code);
    
    // Pequeña pausa para no exceder rate limit
    await new Promise(r => setTimeout(r, 200));
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

// ===== OBTENER STATS DE EQUIPO =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== RESULTADOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  try {
    for (const comp of COMPETITIONS.slice(0, 5)) {
      const response = await fetch(
        `${API_URL}/competitions/${comp.code}/matches?status=FINISHED`,
        { 
          headers: { 'X-Auth-Token': API_KEY },
          signal: AbortSignal.timeout(8000)
        }
      );
      
      if (!response.ok) continue;
      
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
      
      await new Promise(r => setTimeout(r, 200));
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
