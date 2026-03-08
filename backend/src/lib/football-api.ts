// API de Fútbol - El Dios Yerson
// 📺 Fuente: ESPN (GRATIS, sin límites, todas las ligas)

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
  homeCompetitorRaw?: any;
  awayCompetitorRaw?: any;
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
const CACHE_DURATION = 5 * 60 * 1000;

// ===== ESPN API =====
const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

console.log('⚽ Fuente: ESPN (GRATIS, sin límites, todas las ligas)');

// ===== LIGAS ESPN =====
const ESPN_LEAGUES = [
  { code: 'col.1', name: 'Liga BetPlay', country: 'Colombia' },
  { code: 'arg.1', name: 'Liga Argentina', country: 'Argentina' },
  { code: 'bra.1', name: 'Brasileirão', country: 'Brasil' },
  { code: 'mex.1', name: 'Liga MX', country: 'México' },
  { code: 'eng.1', name: 'Premier League', country: 'Inglaterra' },
  { code: 'esp.1', name: 'La Liga', country: 'España' },
  { code: 'ita.1', name: 'Serie A', country: 'Italia' },
  { code: 'ger.1', name: 'Bundesliga', country: 'Alemania' },
  { code: 'fra.1', name: 'Ligue 1', country: 'Francia' },
  { code: 'uefa.champions', name: 'Champions League', country: 'Europa' },
  { code: 'uefa.europa', name: 'Europa League', country: 'Europa' },
  { code: 'usa.1', name: 'MLS', country: 'Estados Unidos' },
  { code: 'ned.1', name: 'Eredivisie', country: 'Holanda' },
  { code: 'por.1', name: 'Primeira Liga', country: 'Portugal' },
  { code: 'tur.1', name: 'Süper Lig', country: 'Turquía' },
];

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 7): Promise<MatchForApp[]> {
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    return cachedMatches;
  }

  console.log('🌐 Obteniendo partidos de ESPN...');
  const startTime = Date.now();

  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();

  const fechas = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  });

  console.log(`📅 Fechas: ${fechas.slice(0, 3).join(', ')}...`);

  const requests: Promise<{ fecha: string; league: typeof ESPN_LEAGUES[0]; data: any }>[] = [];

  for (const league of ESPN_LEAGUES) {
    for (const fecha of fechas) {
      requests.push(
        fetch(`${ESPN_API}/${league.code}/scoreboard?dates=${fecha}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000)
        })
        .then(r => r.json())
        .then(data => ({ fecha, league, data }))
        .catch(() => ({ fecha, league, data: { events: [] } }))
      );
    }
  }

  console.log(`📡 Haciendo ${requests.length} peticiones en paralelo...`);
  const responses = await Promise.all(requests);

  for (const { fecha, league, data } of responses) {
    const events = data.events || [];

    for (const event of events) {
      if (event.status?.type?.completed === true) continue;

      const matchId = `espn_${event.id}`;
      if (seenIds.has(matchId)) continue;
      seenIds.add(matchId);

      const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home');
      const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away');

      let status = 'Scheduled';
      const statusType = event.status?.type?.state || '';
      if (statusType === 'in') status = 'LIVE';
      else if (statusType === 'post') status = 'FT';
      else if (event.status?.type?.shortDetail) status = event.status.type.shortDetail;

      allMatches.push({
        id: matchId,
        homeTeam: homeTeam?.team?.displayName || 'TBD',
        awayTeam: awayTeam?.team?.displayName || 'TBD',
        league: league.name,
        country: league.country,
        matchDate: event.date,
        status,
        homeLogo: homeTeam?.team?.logo,
        awayLogo: awayTeam?.team?.logo,
        leagueLogo: data.leagues?.[0]?.logos?.[0]?.href,
        homeTeamId: parseInt(homeTeam?.team?.id || '0'),
        awayTeamId: parseInt(awayTeam?.team?.id || '0'),
        homeCompetitorRaw: homeTeam,
        awayCompetitorRaw: awayTeam,
      });
    }
  }

  allMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  cachedMatches = allMatches;
  cacheTime = Date.now();

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ TOTAL: ${allMatches.length} partidos en ${(elapsed / 1000).toFixed(1)}s`);

  const byLeague = new Map<string, number>();
  for (const m of allMatches) byLeague.set(m.league, (byLeague.get(m.league) || 0) + 1);
  console.log('\n📊 Por liga:');
  for (const [league, count] of Array.from(byLeague.entries())) console.log(`  ${league}: ${count}`);

  return allMatches;
}

// ===== RESULTADOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  try {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

    for (const league of ESPN_LEAGUES) {
      const response = await fetch(
        `${ESPN_API}/${league.code}/scoreboard?dates=${today}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );

      if (!response.ok) continue;

      const data: any = await response.json();
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
    return homeScore >= awayScore ? 'won' : 'lost';
  }
  if (normalizedPick.includes('x2') || normalizedPick.includes('gana o empata (x2)')) {
    return awayScore >= homeScore ? 'won' : 'lost';
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

// ===== OBTENER SCORES EN VIVO =====
export async function getLiveScores(matchIds: string[]): Promise<Map<string, { homeScore: number; awayScore: number; status: string; minute?: number }>> {
  const scores = new Map<string, { homeScore: number; awayScore: number; status: string; minute?: number }>();
  
  if (matchIds.length === 0) return scores;

  try {
    const today = new Date();
    const dates: string[] = [];
    
    // Ayer, hoy y mañana
    for (let i = -1; i <= 1; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    const requests: Promise<any>[] = [];

    for (const league of ESPN_LEAGUES) {
      for (const date of dates) {
        requests.push(
          fetch(`${ESPN_API}/${league.code}/scoreboard?dates=${date}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000)
          })
          .then(r => r.json())
          .catch(() => ({}))
        );
      }
    }

    const responses = await Promise.all(requests);

    for (const data of responses) {
      const events = data.events || [];
      
      for (const event of events) {
        const matchId = `espn_${event.id}`;
        
        // Solo procesar si está en nuestra lista
        if (!matchIds.includes(matchId)) continue;

        const competitors = event.competitions?.[0]?.competitors || [];
        if (competitors.length < 2) continue;

        const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competitors.find((c: any) => c.homeAway === 'away');

        const homeScore = parseInt(homeTeam?.score?.value || homeTeam?.score || '0') || 0;
        const awayScore = parseInt(awayTeam?.score?.value || awayTeam?.score || '0') || 0;
        
        // Estado del partido
        let status = 'scheduled';
        let minute: number | undefined;
        
        const statusState = event.status?.type?.state;
        const shortDetail = event.status?.type?.shortDetail || '';
        
        if (statusState === 'in') {
          status = 'live';
          // Intentar obtener el minuto
          const minuteMatch = shortDetail.match(/(\d+)/);
          if (minuteMatch) {
            minute = parseInt(minuteMatch[1]);
          }
        } else if (statusState === 'post') {
          status = 'finished';
        } else if (event.status?.type?.completed) {
          status = 'finished';
        }

        scores.set(matchId, { homeScore, awayScore, status, minute });
      }
    }

    console.log(`📊 Scores en vivo obtenidos: ${scores.size} partidos`);
    
  } catch (error) {
    console.error('Error obteniendo scores en vivo:', error);
  }

  return scores;
}

// ===== OBTENER SCORE DE UN PARTIDO ESPECÍFICO =====
export async function getMatchLiveScore(matchId: string): Promise<{ homeScore: number; awayScore: number; status: string; minute?: number } | null> {
  const scores = await getLiveScores([matchId]);
  return scores.get(matchId) || null;
}
