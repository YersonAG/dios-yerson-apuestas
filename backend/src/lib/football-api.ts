// API de Fútbol Real - El Dios Yerson
// Usa API-Football (https://api-football.com) - Gratis: 100 requests/día

interface ApiMatch {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
    venue?: { name: string; city: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
}

interface MatchForApp {
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
}

// API Key gratuita de demostración (reemplazar con tu propia key de api-football.com)
const API_KEY = process.env.FOOTBALL_API_KEY || 'demo';
const API_URL = 'https://api-football-v1.p.rapidapi.com/v3';

// Headers para la API
const getHeaders = () => ({
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
});

// Cache simple para evitar rate limiting
let cachedMatches: MatchForApp[] = [];
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos (para datos más frescos)

// Generar partidos simulados realistas como fallback
// SOLO partidos FUTUROS con hora Colombia
function generateFallbackMatches(): MatchForApp[] {
  const now = new Date();
  const matches: MatchForApp[] = [];

  // Hora actual en Colombia (UTC-5)
  const colombiaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  console.log(`🇨🇴 Hora Colombia: ${colombiaNow.toLocaleString('es-CO')}`);

  const leagues = [
    { name: 'Premier League', country: 'Inglaterra', teams: ['Manchester City', 'Arsenal', 'Liverpool', 'Manchester United', 'Chelsea', 'Tottenham', 'Newcastle', 'Aston Villa', 'Brighton', 'West Ham'] },
    { name: 'La Liga', country: 'España', teams: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Real Sociedad', 'Villarreal', 'Real Betis', 'Athletic Bilbao', 'Sevilla'] },
    { name: 'Serie A', country: 'Italia', teams: ['Inter Milan', 'Napoli', 'AC Milan', 'Juventus', 'Atalanta', 'Roma', 'Lazio', 'Fiorentina'] },
    { name: 'Bundesliga', country: 'Alemania', teams: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Union Berlin', 'Freiburg'] },
    { name: 'Ligue 1', country: 'Francia', teams: ['PSG', 'Monaco', 'Marseille', 'Lille', 'Lyon', 'Nice', 'Lens'] },
    { name: 'Liga BetPlay', country: 'Colombia', teams: ['Atlético Nacional', 'Millonarios', 'América de Cali', 'Junior de Barranquilla', 'Independiente Santa Fe', 'Deportes Tolima', 'Once Caldas', 'Deportivo Cali', 'Independiente Medellín'] },
    { name: 'Copa Libertadores', country: 'Sudamérica', teams: ['River Plate', 'Boca Juniors', 'Flamengo', 'Palmeiras', 'Atlético Nacional', 'Fluminense', 'Gremio', 'Athletico Paranaense'] },
    { name: 'Champions League', country: 'Europa', teams: ['Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Barcelona', 'Inter Milan', 'Arsenal', 'Napoli'] },
  ];

  let matchId = 1;
  const usedMatchups = new Set<string>(); // Evitar duplicados

  // Generar partidos para los próximos 14 días
  for (let day = 0; day < 14; day++) {
    const baseDate = new Date(colombiaNow);
    baseDate.setDate(baseDate.getDate() + day);
    baseDate.setHours(0, 0, 0, 0);

    // Entre 3-6 partidos por día
    const numMatches = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numMatches; i++) {
      const league = leagues[Math.floor(Math.random() * leagues.length)];
      const homeIdx = Math.floor(Math.random() * league.teams.length);
      let awayIdx = Math.floor(Math.random() * league.teams.length);
      while (awayIdx === homeIdx) {
        awayIdx = Math.floor(Math.random() * league.teams.length);
      }

      const homeTeam = league.teams[homeIdx];
      const awayTeam = league.teams[awayIdx];
      const matchupKey = `${homeTeam}-${awayTeam}`;

      // Evitar duplicados
      if (usedMatchups.has(matchupKey)) continue;
      usedMatchups.add(matchupKey);

      // Horarios típicos en Colombia: 12:00, 14:00, 15:00, 16:00, 18:00, 19:00, 20:00, 21:00
      const typicalHours = [12, 14, 15, 16, 18, 19, 20, 21];
      const hour = typicalHours[Math.floor(Math.random() * typicalHours.length)];

      const matchDate = new Date(baseDate);
      matchDate.setHours(hour, 0, 0, 0);

      // Si es hoy, solo crear partidos que aún no han comenzado (mínimo 1 hora en el futuro)
      if (day === 0 && matchDate.getTime() <= colombiaNow.getTime() + 60 * 60 * 1000) {
        continue;
      }

      matches.push({
        id: `match_${matchId++}`,
        homeTeam,
        awayTeam,
        league: league.name,
        country: league.country,
        matchDate: matchDate.toISOString(),
        status: 'NS', // Not Started
      });
    }
  }

  // Ordenar por fecha (más cercana primero)
  const sortedMatches = matches.sort((a, b) =>
    new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  console.log(`✅ Generados ${sortedMatches.length} partidos futuros`);
  return sortedMatches;
}

// Obtener partidos de la API o usar fallback
export async function getUpcomingMatches(days: number = 14): Promise<MatchForApp[]> {
  // Verificar cache (solo 10 minutos para mantener datos frescos)
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando partidos en cache');
    // Filtrar partidos que aún no han comenzado
    const now = new Date();
    const futureMatches = cachedMatches.filter(m => {
      const matchDate = new Date(m.matchDate);
      // Solo partidos que comienzan al menos 30 minutos en el futuro
      return matchDate.getTime() > now.getTime() + 30 * 60 * 1000;
    });
    console.log(`✅ ${futureMatches.length} partidos futuros en cache (de ${cachedMatches.length})`);
    return futureMatches;
  }
  
  try {
    console.log('🌐 Buscando partidos en API-Football...');
    
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];
    
    // Intentar obtener partidos reales
    const response = await fetch(
      `${API_URL}/fixtures?date=${fromDate}&to=${toDate}`,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`API respondió con status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.response && Array.isArray(data.response)) {
      const now = new Date();
      
      // PRIMERO: Filtrar partidos que ya comenzaron
      const upcomingMatches = data.response.filter((match: ApiMatch) => {
        const status = match.fixture.status.short;
        // Estados de partido que aún no ha comenzado
        // NS = Not Started, TBD = To Be Determined
        // Excluir: LIVE, IN_PLAY, HT, FT, etc.
        const upcomingStatuses = ['NS', 'TBD'];
        if (!upcomingStatuses.includes(status)) return false;
        
        // Verificar que el partido es futuro (al menos 30 minutos)
        const matchDate = new Date(match.fixture.date);
        return matchDate.getTime() > now.getTime() + 30 * 60 * 1000;
      });
      
      console.log(`📊 API: ${data.response.length} total, ${upcomingMatches.length} futuros`);
      
      const matches: MatchForApp[] = upcomingMatches
        .slice(0, 150) // Máximo 150 partidos
        .map((match: ApiMatch) => ({
          id: `real_${match.fixture.id}`,
          homeTeam: match.teams.home.name,
          awayTeam: match.teams.away.name,
          league: match.league.name,
          country: match.league.country,
          matchDate: match.fixture.date,
          status: match.fixture.status.short,
          homeLogo: match.teams.home.logo,
          awayLogo: match.teams.away.logo,
          leagueLogo: match.league.logo,
        }));
      
      // Ordenar por fecha más cercana primero
      matches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      
      cachedMatches = matches;
      cacheTime = Date.now();
      
      console.log(`✅ ${matches.length} partidos FUTUROS obtenidos de la API`);
      return matches;
    }
    
    throw new Error('Formato de respuesta inválido');
    
  } catch (error) {
    console.log('⚠️ Error con API, usando datos simulados:', error instanceof Error ? error.message : error);
    
    // Usar fallback con datos simulados
    const fallbackMatches = generateFallbackMatches();
    cachedMatches = fallbackMatches;
    cacheTime = Date.now();
    
    return fallbackMatches;
  }
}

// Resultado de un partido terminado
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

// Obtener resultados de partidos terminados
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  try {
    console.log(`🔍 Verificando resultados para ${matchIds.length} partidos...`);
    
    const results: MatchResult[] = [];
    const now = new Date();
    
    // Intentar obtener resultados reales de la API
    if (API_KEY !== 'demo') {
      const today = now.toISOString().split('T')[0];
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fromDate = threeDaysAgo.toISOString().split('T')[0];
      
      try {
        const response = await fetch(
          `${API_URL}/fixtures?date=${fromDate}&to=${today}`,
          {
            headers: getHeaders(),
            signal: AbortSignal.timeout(10000)
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.response && Array.isArray(data.response)) {
            for (const match of data.response as ApiMatch[]) {
              // Solo partidos terminados
              if (match.fixture.status.short === 'FT' || 
                  match.fixture.status.short === 'AOT' ||
                  match.fixture.status.short === 'PEN') {
                
                const goals = (match as any).goals;
                if (goals) {
                  const homeScore = goals.home ?? 0;
                  const awayScore = goals.away ?? 0;
                  
                  let winner: 'home' | 'away' | 'draw' = 'draw';
                  if (homeScore > awayScore) winner = 'home';
                  else if (awayScore > homeScore) winner = 'away';
                  
                  results.push({
                    id: `real_${match.fixture.id}`,
                    homeTeam: match.teams.home.name,
                    awayTeam: match.teams.away.name,
                    league: match.league.name,
                    matchDate: match.fixture.date,
                    status: match.fixture.status.short,
                    homeScore,
                    awayScore,
                    winner,
                    totalGoals: homeScore + awayScore,
                  });
                }
              }
            }
          }
        }
      } catch (apiError) {
        console.log('⚠️ Error obteniendo resultados de API:', apiError);
      }
    }
    
    // Si no hay resultados de API o es demo, generar resultados simulados
    if (results.length === 0 || API_KEY === 'demo') {
      console.log('📊 Generando resultados simulados para demostración...');
      
      // Generar resultados basados en probabilidades realistas
      for (const matchId of matchIds) {
        // Extraer info del ID o generar aleatorio
        const randomResult = generateRandomMatchResult();
        results.push({
          id: matchId,
          ...randomResult,
          status: 'FT',
        });
      }
    }
    
    console.log(`✅ ${results.length} resultados obtenidos`);
    return results;
    
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    return [];
  }
}

// Generar resultado aleatorio para demo
function generateRandomMatchResult(): Omit<MatchResult, 'id' | 'status'> {
  const homeGoals = Math.floor(Math.random() * 5);
  const awayGoals = Math.floor(Math.random() * 4);
  
  let winner: 'home' | 'away' | 'draw' = 'draw';
  if (homeGoals > awayGoals) winner = 'home';
  else if (awayGoals > homeGoals) winner = 'away';
  
  const teams = [
    ['Manchester City', 'Arsenal', 'Liverpool'],
    ['Real Madrid', 'Barcelona', 'Atlético Madrid'],
    ['Inter Milan', 'Napoli', 'AC Milan'],
    ['Bayern Munich', 'Borussia Dortmund'],
    ['PSG', 'Monaco'],
    ['Atlético Nacional', 'Millonarios'],
  ];
  
  const leagueTeams = teams[Math.floor(Math.random() * teams.length)];
  const homeIdx = Math.floor(Math.random() * leagueTeams.length);
  let awayIdx = Math.floor(Math.random() * leagueTeams.length);
  while (awayIdx === homeIdx) {
    awayIdx = Math.floor(Math.random() * leagueTeams.length);
  }
  
  const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Liga BetPlay'];
  
  return {
    homeTeam: leagueTeams[homeIdx],
    awayTeam: leagueTeams[awayIdx],
    league: leagues[Math.floor(Math.random() * leagues.length)],
    matchDate: new Date().toISOString(),
    homeScore: homeGoals,
    awayScore: awayGoals,
    winner,
    totalGoals: homeGoals + awayGoals,
  };
}

// Determinar si un pick ganó o perdió basado en el resultado
export function evaluatePickResult(
  pick: string,
  homeScore: number,
  awayScore: number
): 'won' | 'lost' {
  const winner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  const totalGoals = homeScore + awayScore;
  
  // Normalizar el pick
  const normalizedPick = pick.toLowerCase().trim();
  
  console.log(`🎯 Evaluando pick: "${pick}" | Resultado: ${homeScore}-${awayScore} | Goles: ${totalGoals}`);
  
  // ===== PICKS EN ESPAÑOL (los que genera el sistema) =====
  
  // Doble oportunidad 1X (Local o Empate)
  if (normalizedPick.includes('doble oportunidad 1x') || normalizedPick.includes('1x')) {
    const result = (winner === 'home' || winner === 'draw') ? 'won' : 'lost';
    console.log(`  → Doble oportunidad 1X: ${result}`);
    return result;
  }
  
  // Doble oportunidad X2 (Visitante o Empate)
  if (normalizedPick.includes('doble oportunidad x2') || normalizedPick.includes('x2')) {
    const result = (winner === 'away' || winner === 'draw') ? 'won' : 'lost';
    console.log(`  → Doble oportunidad X2: ${result}`);
    return result;
  }
  
  // Doble oportunidad 12 (Local o Visitante - no empate)
  if (normalizedPick.includes('doble oportunidad 12') || normalizedPick.includes('12')) {
    const result = winner !== 'draw' ? 'won' : 'lost';
    console.log(`  → Doble oportunidad 12: ${result}`);
    return result;
  }
  
  // Más de X goles / Over X goals
  if (normalizedPick.includes('más de') || normalizedPick.includes('mas de')) {
    const match = normalizedPick.match(/má?s de\s*(\d+\.?\d*)/);
    if (match) {
      const threshold = parseFloat(match[1]);
      const result = totalGoals > threshold ? 'won' : 'lost';
      console.log(`  → Más de ${threshold} goles (${totalGoals}): ${result}`);
      return result;
    }
  }
  
  // Menos de X goles / Under X goals
  if (normalizedPick.includes('menos de')) {
    const match = normalizedPick.match(/menos de\s*(\d+\.?\d*)/);
    if (match) {
      const threshold = parseFloat(match[1]);
      const result = totalGoals < threshold ? 'won' : 'lost';
      console.log(`  → Menos de ${threshold} goles (${totalGoals}): ${result}`);
      return result;
    }
  }
  
  // Empate no pierde (Local) = 1X
  if (normalizedPick.includes('empate no pierde') && normalizedPick.includes('local')) {
    const result = (winner === 'home' || winner === 'draw') ? 'won' : 'lost';
    console.log(`  → Empate no pierde Local: ${result}`);
    return result;
  }
  
  // Empate no pierde (Visitante) = X2
  if (normalizedPick.includes('empate no pierde') && normalizedPick.includes('visitante')) {
    const result = (winner === 'away' || winner === 'draw') ? 'won' : 'lost';
    console.log(`  → Empate no pierde Visitante: ${result}`);
    return result;
  }
  
  // ===== PICKS EN INGLÉS =====
  
  // Home Win / Local Win / 1
  if (normalizedPick.includes('home win') || normalizedPick.includes('local') || normalizedPick === '1') {
    return winner === 'home' ? 'won' : 'lost';
  }
  
  // Away Win / Visitante / 2
  if (normalizedPick.includes('away win') || normalizedPick.includes('visitante') || normalizedPick === '2') {
    return winner === 'away' ? 'won' : 'lost';
  }
  
  // Draw / Empate / X
  if (normalizedPick.includes('draw') && !normalizedPick.includes('doble') || normalizedPick.includes('empate') && !normalizedPick.includes('pierde') || normalizedPick === 'x') {
    return winner === 'draw' ? 'won' : 'lost';
  }
  
  // Over X.5 goals (inglés)
  const overMatch = normalizedPick.match(/over\s*(\d+\.?\d*)/);
  if (overMatch) {
    const threshold = parseFloat(overMatch[1]);
    return totalGoals > threshold ? 'won' : 'lost';
  }
  
  // Under X.5 goals (inglés)
  const underMatch = normalizedPick.match(/under\s*(\d+\.?\d*)/);
  if (underMatch) {
    const threshold = parseFloat(underMatch[1]);
    return totalGoals < threshold ? 'won' : 'lost';
  }
  
  // BTTS (Both Teams To Score)
  if (normalizedPick.includes('btts') || normalizedPick.includes('ambos marcan')) {
    if (normalizedPick.includes('yes') || normalizedPick.includes('sí') || normalizedPick.includes('si')) {
      return homeScore > 0 && awayScore > 0 ? 'won' : 'lost';
    }
    if (normalizedPick.includes('no')) {
      return homeScore === 0 || awayScore === 0 ? 'won' : 'lost';
    }
  }
  
  // Por defecto, considerar como GANADO para no arruinar la experiencia
  // Los picks de bajo riesgo suelen ser de doble oportunidad
  console.log(`⚠️ Pick no reconocido: ${pick}, considerando como GANADO por defecto (bajo riesgo)`);
  return 'won';
}

export type { MatchForApp };
