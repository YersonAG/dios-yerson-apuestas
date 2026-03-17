// Motor de Apuestas - El Dios Yerson
// Motor Matemático v5.4 - Poisson + Elo + ESPN Standings + Multi-Pick Selection
// FILOSOFÍA: No buscamos el pick más rentable, buscamos el más SEGURO.
// NUEVO v5.4: Muestra TOP 3 picks por partido para que el usuario seleccione

import { MatchForApp } from './football-api';

// ==========================================
// TIPOS
// ==========================================
export interface TeamGoals {
  goalsFor: number;
  goalsAgainst: number;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  position?: number;
}

export interface TeamStats {
  teamId: number;
  name: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  form: string[];
  formScore: number;
}

export interface PoissonResult {
  lambdaHome: number;
  lambdaAway: number;
  probHomeWin: number;
  probDraw: number;
  probAwayWin: number;
  probOver15: number;
  probOver25: number;
  probUnder25: number;
  probUnder35: number;
  probUnder45: number;
  probBTTS: number;
}

export interface BetOption {
  type: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW'
      | 'DOUBLE_CHANCE_1X' | 'DOUBLE_CHANCE_X2'
      | 'OVER_15' | 'OVER_25'
      | 'UNDER_25' | 'UNDER_35' | 'UNDER_45'
      | 'BTTS_YES' | 'BTTS_NO';
  probability: number;
  confidence: number;
  label: string;
  reasoning: string[];
}

// Pick seleccionable para la UI - con toda la info necesaria
export interface SelectablePick {
  type: string;
  label: string;
  probability: number;
  confidence: number;
  odds: number;
  reasoning: string[];
  selected?: boolean;
}

export interface PickResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  pick: BetOption;
  safePicks: BetOption[];
  allOptions: BetOption[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_BET';
  modelVersion: string;
  top3Picks: SelectablePick[];
}

export interface MatchPick {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  pick: string;
  odds: number;
  probability: number;
  analysis: string;
  score: number;
  monteCarloProb: number;
  eloDiff: number;
  xGTotal: number;
  volatility: number;
  valueBet: number;
  status: 'pending' | 'live' | 'won' | 'lost';
  homeTeamId?: number;
  awayTeamId?: number;
  safePicks?: string[];
  topPicks?: SelectablePick[];
  selectedPickIndices?: number[];
}

export interface Combinada {
  id: string;
  picks: MatchPick[];
  totalOdds: number;
  totalProbability: number;
  score: number;
  risk: 'low';
  status: 'pending' | 'live' | 'won' | 'lost';
  taken: boolean;
}

export interface MatchAnalysis {
  homeTeam: string;
  awayTeam: string;
  league: string;
  score: number;
  eloDiff: number;
  xGTotal: number;
  monteCarloProb: number;
  volatility: number;
  valueBet: number;
  bestPick: {
    label: string;
    probability: number;
    odds: number;
    reasoning: string;
  };
}

// ==========================================
// CONSTANTES
// ==========================================
const LEAGUE_AVG_GOALS = 1.35;
const CACHE_DURATION = 30 * 60 * 1000;

const goalsCache = new Map<string, Map<string, TeamGoals>>();
const goalsCacheTime = new Map<string, number>();
const competitionHistoryCache = new Map<string, Map<string, TeamGoals>>();
const competitionHistoryCacheTime = new Map<string, number>();

// ==========================================
// MAPEO DE LIGAS
// ==========================================
const LEAGUE_CODE_MAP: Record<string, string> = {
  'Premier League': 'eng.1', 'La Liga': 'esp.1', 'Serie A': 'ita.1',
  'Bundesliga': 'ger.1', 'Ligue 1': 'fra.1', 'Eredivisie': 'ned.1',
  'Primeira Liga': 'por.1', 'Süper Lig': 'tur.1', 'Jupiler Pro League': 'bel.1',
  'Scottish Premiership': 'sco.1', 'Greek Super League': 'gre.1',
  'Russian Premier League': 'rus.1', 'Austrian Bundesliga': 'aut.1',
  'Eliteserien': 'nor.1', 'Allsvenskan': 'swe.1',
  'Champions League': 'uefa.champions', 'Europa League': 'uefa.europa',
  'Conference League': 'uefa.conference',
  'Liga BetPlay': 'col.1', 'Liga Argentina': 'arg.1', 'Brasileirão': 'bra.1',
  'Liga MX': 'mex.1', 'Chilean Primera': 'chi.1', 'Ecuadorian Serie A': 'ecu.1',
  'Peruvian Liga 1': 'per.1', 'Uruguayan Primera': 'uru.1',
  'Paraguayan Primera': 'par.1', 'Venezuelan Primera': 'ven.1',
  'Bolivian Primera': 'bol.1',
  'Copa Libertadores': 'conmebol.libertadores',
  'Copa Sudamericana': 'conmebol.sudamericana',
  'MLS': 'usa.1', 'Costa Rican Primera': 'crc.1',
  'A-League': 'aus.1', 'J-League': 'jpn.1', 'Chinese Super League': 'chn.1',
  'Indian Super League': 'ind.1',
};

const COMPETITION_STANDINGS_SUPPORTED = ['uefa.champions', 'uefa.europa'];
const COMPETITION_HISTORY_LEAGUES = ['uefa.conference', 'conmebol.libertadores', 'conmebol.sudamericana'];

// ==========================================
// FUNCIONES DE DATOS
// ==========================================
async function getGoalsFromCompetitionHistory(leagueCode: string): Promise<Map<string, TeamGoals>> {
  const cached = competitionHistoryCache.get(leagueCode);
  const cachedTime = competitionHistoryCacheTime.get(leagueCode);
  if (cached && cachedTime && Date.now() - cachedTime < CACHE_DURATION) return cached;

  const teamGoals = new Map<string, TeamGoals>();
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const seasonStartYear = currentMonth >= 9 ? currentYear : currentYear - 1;
    const start = `${seasonStartYear}0901`;
    const end = today.toISOString().split('T')[0].replace(/-/g, '');

    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard?dates=${start}-${end}`;
    console.log(`📊 Historial ${leagueCode}: ${start}-${end}`);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return teamGoals;

    const data: any = await res.json();
    const events = data.events || [];

    for (const event of events) {
      if (!event.status?.type?.completed) continue;
      const competitors = event.competitions?.[0]?.competitors || [];
      if (competitors.length < 2) continue;

      for (const competitor of competitors) {
        const name = competitor.team?.displayName?.toLowerCase();
        if (!name) continue;
        const gf = parseInt(competitor.score?.value || competitor.score || '0');
        const rival = competitors.find((c: any) => c.team?.id !== competitor.team?.id);
        const ga = parseInt(rival?.score?.value || rival?.score || '0');
        let result = 'D';
        if (gf > ga) result = 'W';
        else if (gf < ga) result = 'L';

        const current = teamGoals.get(name) || {
          goalsFor: 0, goalsAgainst: 0, played: 0, wins: 0, draws: 0, losses: 0, position: 10,
        };
        teamGoals.set(name, {
          goalsFor: current.goalsFor + gf, goalsAgainst: current.goalsAgainst + ga,
          played: current.played + 1, wins: current.wins + (result === 'W' ? 1 : 0),
          draws: current.draws + (result === 'D' ? 1 : 0),
          losses: current.losses + (result === 'L' ? 1 : 0), position: current.position,
        });
      }
    }

    console.log(`✅ ${teamGoals.size} equipos con historial`);
    competitionHistoryCache.set(leagueCode, teamGoals);
    competitionHistoryCacheTime.set(leagueCode, Date.now());
  } catch (error: any) {
    console.error(`❌ Error historial ${leagueCode}:`, error.message);
  }
  return teamGoals;
}

async function getGoalsFromESPNStandings(leagueCode: string): Promise<Map<string, TeamGoals>> {
  const result = new Map<string, TeamGoals>();
  const cached = goalsCache.get(leagueCode);
  const cachedTime = goalsCacheTime.get(leagueCode);
  if (cached && cachedTime && Date.now() - cachedTime < CACHE_DURATION) return cached;

  try {
    console.log(`📊 ESPN Standings: ${leagueCode}`);
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return result;

    const data: any = await res.json();
    let entries = data.standings?.entries || [];
    if (entries.length === 0 && data.children) {
      for (const child of data.children) {
        if (child.standings?.entries?.length > 0) {
          entries = entries.concat(child.standings.entries);
        }
      }
    }

    for (const entry of entries) {
      const teamName = entry.team?.displayName?.toLowerCase() || '';
      const stats = entry.stats || [];
      const getStat = (name: string): number => {
        const stat = stats.find((s: any) => s.name === name);
        return stat?.value || 0;
      };

      let goalsFor = getStat('pointsFor') || getStat('goalsFor') || getStat('goalsScored') || 0;
      let goalsAgainst = getStat('pointsAgainst') || getStat('goalsAgainst') || getStat('goalsConceded') || 0;
      let wins = getStat('wins') || 0;
      let losses = getStat('losses') || 0;
      let draws = getStat('ties') || getStat('draws') || 0;
      const position = getStat('rank') || parseInt(entry.team?.rank || '0') || 10;

      if (teamName && (goalsFor > 0 || goalsAgainst > 0)) {
        result.set(teamName, { goalsFor, goalsAgainst, played: wins + draws + losses, wins, draws, losses, position });
      }
    }

    console.log(`✅ Standings: ${result.size} equipos`);
    goalsCache.set(leagueCode, result);
    goalsCacheTime.set(leagueCode, Date.now());
  } catch (error: any) {
    console.error(`❌ Error Standings:`, error.message);
  }
  return result;
}

// ==========================================
// HELPERS
// ==========================================
function getStat(stats: any[], name: string): number {
  const stat = stats?.find(s => s.name === name);
  return stat ? parseFloat(stat.value) || 0 : 0;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poisson(lambda: number, k: number): number {
  return (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / factorial(k);
}

// ==========================================
// EXTRACCIÓN DE STATS
// ==========================================
async function extractTeamStats(competitor: any, leagueCode?: string): Promise<TeamStats | null> {
  if (!competitor) return null;

  const teamId = parseInt(competitor.team?.id || '0');
  const teamName = competitor.team?.displayName?.toLowerCase() || '';

  // Nivel 1: Stats directas del scoreboard
  if (competitor.statistics && competitor.statistics.length > 0) {
    const stats = competitor.statistics;
    const records = competitor.records || [];
    const totalRecord = records.find((r: any) => r.type === 'total') || records[0] || {};
    const recordParts = (totalRecord.summary || '0-0-0').split('-').map((n: string) => parseInt(n) || 0);
    let wins = recordParts[0] || 0, draws = recordParts[1] || 0, losses = recordParts[2] || 0;
    let played = wins + draws + losses || 1;
    const goalsFor = getStat(stats, 'totalGoals') || getStat(stats, 'goalsScored') || 0;
    const goalsAgainst = getStat(stats, 'goalsConceded') || 0;

    if (goalsFor > 0 || goalsAgainst > 0) {
      let form: string[] = [];
      if (competitor.form && typeof competitor.form === 'string') {
        form = competitor.form.toUpperCase().split('').slice(-5);
      }
      const formScore = form.length > 0
        ? form.reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15
        : 0.5;
      return {
        teamId, name: competitor.team?.displayName || 'Desconocido',
        position: getStat(stats, 'rank') || 10, played, wins, draws, losses, goalsFor, goalsAgainst,
        avgGoalsFor: played > 0 ? goalsFor / played : 1.35,
        avgGoalsAgainst: played > 0 ? goalsAgainst / played : 1.35, form, formScore,
      };
    }
  }

  // Nivel 2: ESPN Standings
  if (leagueCode) {
    const leagueGoals = await getGoalsFromESPNStandings(leagueCode);
    let realGoals = leagueGoals.get(teamName) || null;
    if (!realGoals) {
      for (const [name, data] of Array.from(leagueGoals.entries())) {
        if (name.includes(teamName) || teamName.includes(name)) {
          realGoals = data;
          break;
        }
      }
    }

    if (realGoals && (realGoals.goalsFor > 0 || realGoals.goalsAgainst > 0)) {
      console.log(`✅ Goles REALES para ${competitor.team?.displayName}: GF ${realGoals.goalsFor}, GA ${realGoals.goalsAgainst}`);
      let form: string[] = [];
      if (competitor.form && typeof competitor.form === 'string') {
        form = competitor.form.toUpperCase().split('').slice(-5);
      }
      const formScore = form.length > 0
        ? form.reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15
        : 0.5;
      const played = realGoals.played || 1;
      return {
        teamId, name: competitor.team?.displayName || 'Desconocido',
        position: realGoals.position || 10, played,
        wins: realGoals.wins || 0, draws: realGoals.draws || 0, losses: realGoals.losses || 0,
        goalsFor: realGoals.goalsFor, goalsAgainst: realGoals.goalsAgainst,
        avgGoalsFor: played > 0 ? realGoals.goalsFor / played : 1.35,
        avgGoalsAgainst: played > 0 ? realGoals.goalsAgainst / played : 1.35, form, formScore,
      };
    }
  }

  // Nivel 3: Historial de competición
  if (leagueCode && COMPETITION_HISTORY_LEAGUES.includes(leagueCode)) {
    const historyGoals = await getGoalsFromCompetitionHistory(leagueCode);
    let teamHistory = historyGoals.get(teamName);
    if (!teamHistory) {
      for (const [name, data] of Array.from(historyGoals.entries())) {
        if (name.includes(teamName) || teamName.includes(name)) {
          teamHistory = historyGoals.get(name);
          if (teamHistory) break;
        }
      }
    }

    if (teamHistory && teamHistory.played && teamHistory.played >= 3) {
      let form: string[] = [];
      if (competitor.form && typeof competitor.form === 'string') {
        form = competitor.form.toUpperCase().split('').slice(-5);
      }
      const formScore = form.length > 0
        ? form.reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15
        : 0.5;
      return {
        teamId, name: competitor.team?.displayName || 'Desconocido', position: 10,
        played: teamHistory.played, wins: teamHistory.wins || 0, draws: teamHistory.draws || 0,
        losses: teamHistory.losses || 0, goalsFor: teamHistory.goalsFor,
        goalsAgainst: teamHistory.goalsAgainst,
        avgGoalsFor: teamHistory.goalsFor / teamHistory.played,
        avgGoalsAgainst: teamHistory.goalsAgainst / teamHistory.played, form, formScore,
      };
    }
    return null;
  }

  return null;
}

// ==========================================
// POISSON + ELO
// ==========================================
function calcularPoisson(homeStats: TeamStats, awayStats: TeamStats): PoissonResult {
  const lambdaHome = (homeStats.avgGoalsFor / LEAGUE_AVG_GOALS) * (awayStats.avgGoalsAgainst / LEAGUE_AVG_GOALS) * LEAGUE_AVG_GOALS * 1.1;
  const lambdaAway = (awayStats.avgGoalsFor / LEAGUE_AVG_GOALS) * (homeStats.avgGoalsAgainst / LEAGUE_AVG_GOALS) * LEAGUE_AVG_GOALS;

  const matrix: number[][] = [];
  for (let h = 0; h <= 5; h++) {
    matrix[h] = [];
    for (let a = 0; a <= 5; a++) {
      matrix[h][a] = poisson(lambdaHome, h) * poisson(lambdaAway, a);
    }
  }

  let probHomeWin = 0, probDraw = 0, probAwayWin = 0;
  let probOver15 = 0, probOver25 = 0, probUnder25 = 0, probUnder35 = 0, probUnder45 = 0, probBTTS = 0;

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = matrix[h][a];
      if (h > a) probHomeWin += p;
      else if (h === a) probDraw += p;
      else probAwayWin += p;
      if (h + a > 1.5) probOver15 += p;
      if (h + a > 2.5) probOver25 += p;
      if (h + a < 2.5) probUnder25 += p;
      if (h + a < 3.5) probUnder35 += p;
      if (h + a < 4.5) probUnder45 += p;
      if (h >= 1 && a >= 1) probBTTS += p;
    }
  }

  console.log(`🔢 Poisson: λH=${lambdaHome.toFixed(2)}, λA=${lambdaAway.toFixed(2)}`);
  return { lambdaHome, lambdaAway, probHomeWin, probDraw, probAwayWin, probOver15, probOver25, probUnder25, probUnder35, probUnder45, probBTTS };
}

function calcularElo(stats: TeamStats, base = 1500): number {
  const posicionBonus = (20 - stats.position) * 15;
  const formaBonus = stats.formScore * 100;
  const diferenciaGoles = (stats.goalsFor - stats.goalsAgainst) * 2;
  return base + posicionBonus + formaBonus + diferenciaGoles;
}

function calcularConfianza(poissonProb: number, eloProb: number, formFactor: number): number {
  return Math.round((poissonProb * 0.50 + eloProb * 0.30 + formFactor * 0.20) * 100);
}

// ==========================================
// RAZONAMIENTO
// ==========================================
function generarRazones(home: TeamStats, away: TeamStats, tipo: string): string[] {
  const razones: string[] = [];
  const totalAvg = home.avgGoalsFor + away.avgGoalsFor;

  if (tipo === 'OVER_15') {
    razones.push(`Promedio combinado: ${totalAvg.toFixed(1)} goles/partido`);
    razones.push('La mayoría de ligas supera 1.5 goles');
    if (home.avgGoalsFor > 1.2) razones.push(`${home.name} anota ${home.avgGoalsFor.toFixed(1)} de local`);
    if (away.avgGoalsFor > 1.0) razones.push(`${away.name} anota ${away.avgGoalsFor.toFixed(1)} de visita`);
  }
  if (tipo === 'UNDER_35') {
    if (home.avgGoalsAgainst < 1.2) razones.push(`${home.name} recibe solo ${home.avgGoalsAgainst.toFixed(1)} goles`);
    if (away.avgGoalsAgainst < 1.2) razones.push(`${away.name} recibe solo ${away.avgGoalsAgainst.toFixed(1)} goles`);
    razones.push('Partidos +3 goles: <25%');
  }
  if (tipo === 'UNDER_45') {
    razones.push('Partidos +5 goles: <5%');
    if (totalAvg < 3.0) razones.push(`Promedio bajo: ${totalAvg.toFixed(1)} goles`);
  }
  if (tipo === 'UNDER_25') {
    if (home.avgGoalsAgainst < 1.0) razones.push(`${home.name} defensa sólida: ${home.avgGoalsAgainst.toFixed(1)} goles`);
    if (away.avgGoalsFor < 1.0) razones.push(`${away.name} poco ofensivo`);
    if (home.avgGoalsFor < 1.3 && away.avgGoalsFor < 1.3) razones.push('Ambos equipos con ataques limitados');
  }
  if (tipo === '1X') {
    if (home.formScore > 0.6) razones.push(`${home.name} buena racha: ${home.form.join('-')}`);
    if (home.position < away.position) razones.push(`${home.name} #${home.position} vs #${away.position}`);
    razones.push('Doble oportunidad: 2 de 3 resultados');
  }
  if (tipo === 'X2') {
    if (away.formScore > 0.6) razones.push(`${away.name} buena racha: ${away.form.join('-')}`);
    if (away.position < home.position) razones.push(`${away.name} mejor posición: #${away.position}`);
    razones.push('Doble oportunidad: 2 de 3 resultados');
  }
  if (razones.length === 0) razones.push('Análisis Poisson + ELO');
  return razones;
}

// ==========================================
// CÁLCULO DE APUESTAS
// ==========================================
const PICK_PRIORITY: Record<string, number> = {
  'OVER_15': 100, 'UNDER_35': 95, 'DOUBLE_CHANCE_1X': 90, 'DOUBLE_CHANCE_X2': 90,
  'OVER_25': 85, 'UNDER_25': 80, 'BTTS_YES': 75, 'HOME_WIN': 70, 'AWAY_WIN': 70,
  'BTTS_NO': 65, 'UNDER_45': 50, 'DRAW': 40,
};

function selectBestPick(options: BetOption[]): BetOption {
  const safeOptions = options.filter(o => o.confidence >= 65);
  if (safeOptions.length === 0) return options.reduce((best, curr) => curr.confidence > best.confidence ? curr : best);

  const highConfidencePicks = safeOptions.filter(o => o.confidence >= 70);
  if (highConfidencePicks.length > 0) {
    highConfidencePicks.sort((a, b) => {
      const priorityA = PICK_PRIORITY[a.type] || 50;
      const priorityB = PICK_PRIORITY[b.type] || 50;
      if (priorityA !== priorityB) return priorityB - priorityA;
      return b.confidence - a.confidence;
    });
    return highConfidencePicks[0];
  }
  return safeOptions.reduce((best, curr) => curr.confidence > best.confidence ? curr : best);
}

function calcularTodasLasApuestas(home: TeamStats, away: TeamStats, p: PoissonResult, eloHome: number, eloAway: number): BetOption[] {
  const eloProb = 1 / (1 + Math.pow(10, (eloAway - eloHome) / 400));
  const golesPromedio = home.avgGoalsFor + away.avgGoalsFor;

  return [
    { type: 'HOME_WIN', probability: p.probHomeWin, confidence: calcularConfianza(p.probHomeWin, eloProb, home.formScore), label: 'Gana local', reasoning: generarRazones(home, away, 'HOME') },
    { type: 'AWAY_WIN', probability: p.probAwayWin, confidence: calcularConfianza(p.probAwayWin, 1 - eloProb, away.formScore), label: 'Gana visitante', reasoning: generarRazones(home, away, 'AWAY') },
    { type: 'DRAW', probability: p.probDraw, confidence: calcularConfianza(p.probDraw, 0.3, 0.4), label: 'Empate', reasoning: generarRazones(home, away, 'DRAW') },
    { type: 'DOUBLE_CHANCE_1X', probability: p.probHomeWin + p.probDraw, confidence: calcularConfianza(p.probHomeWin + p.probDraw, Math.min(1, eloProb + 0.15), home.formScore), label: '1X (Local no pierde)', reasoning: generarRazones(home, away, '1X') },
    { type: 'DOUBLE_CHANCE_X2', probability: p.probAwayWin + p.probDraw, confidence: calcularConfianza(p.probAwayWin + p.probDraw, Math.min(1, 1 - eloProb + 0.15), away.formScore), label: 'X2 (Visitante no pierde)', reasoning: generarRazones(home, away, 'X2') },
    { type: 'OVER_15', probability: p.probOver15, confidence: calcularConfianza(p.probOver15, 0.5, Math.min(1, golesPromedio / 4)), label: 'Más de 1.5 goles', reasoning: generarRazones(home, away, 'OVER_15') },
    { type: 'OVER_25', probability: p.probOver25, confidence: calcularConfianza(p.probOver25, 0.5, Math.min(1, golesPromedio / 5)), label: 'Más de 2.5 goles', reasoning: generarRazones(home, away, 'OVER_25') },
    { type: 'UNDER_25', probability: p.probUnder25, confidence: calcularConfianza(p.probUnder25, 0.5, Math.max(0, 1 - golesPromedio / 5)), label: 'Menos de 2.5 goles', reasoning: generarRazones(home, away, 'UNDER_25') },
    { type: 'UNDER_35', probability: p.probUnder35, confidence: calcularConfianza(p.probUnder35, 0.65, Math.max(0, 1 - golesPromedio / 6)), label: 'Menos de 3.5 goles', reasoning: generarRazones(home, away, 'UNDER_35') },
    { type: 'UNDER_45', probability: p.probUnder45, confidence: calcularConfianza(p.probUnder45, 0.80, Math.max(0, 1 - golesPromedio / 8)), label: 'Menos de 4.5 goles', reasoning: generarRazones(home, away, 'UNDER_45') },
    { type: 'BTTS_YES', probability: p.probBTTS, confidence: calcularConfianza(p.probBTTS, 0.5, Math.min(1, (home.avgGoalsFor + away.avgGoalsFor) / 6)), label: 'Ambos anotan', reasoning: generarRazones(home, away, 'BTTS') },
    { type: 'BTTS_NO', probability: 1 - p.probBTTS, confidence: calcularConfianza(1 - p.probBTTS, 0.5, Math.max(0, 1 - (home.avgGoalsFor + away.avgGoalsFor) / 6)), label: 'No ambos anotan', reasoning: generarRazones(home, away, 'BTTS_NO') },
  ];
}

// ==========================================
// ANÁLISIS PRINCIPAL
// ==========================================
export async function analyzeMatchAsync(match: MatchForApp): Promise<PickResult | null> {
  console.log(`\n🔍 Analizando: ${match.homeTeam} vs ${match.awayTeam}`);

  const leagueCode = LEAGUE_CODE_MAP[match.league] || '';
  console.log(`📍 Liga: ${match.league} (${leagueCode || 'sin código'})`);

  const homeStats = await extractTeamStats(match.homeCompetitorRaw, leagueCode);
  const awayStats = await extractTeamStats(match.awayCompetitorRaw, leagueCode);

  if (!homeStats || !awayStats) {
    console.log(`❌ Sin datos — PARTIDO OMITIDO`);
    return null;
  }

  const poissonResult = calcularPoisson(homeStats, awayStats);
  const eloHome = calcularElo(homeStats);
  const eloAway = calcularElo(awayStats);

  const options = calcularTodasLasApuestas(homeStats, awayStats, poissonResult, eloHome, eloAway);
  options.sort((a, b) => b.confidence - a.confidence);

  const bestPick = selectBestPick(options);
  const safePicks = options.filter(o => o.confidence >= 65);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_BET';
  if (bestPick.confidence >= 70) riskLevel = 'LOW';
  else if (bestPick.confidence >= 55) riskLevel = 'MEDIUM';
  else if (bestPick.confidence >= 45) riskLevel = 'HIGH';
  else riskLevel = 'NO_BET';

  console.log(`✅ Pick: ${bestPick.label} (${bestPick.confidence}% confianza) - Riesgo: ${riskLevel}`);

  // TOP 3 picks para selección
  const top3Picks: SelectablePick[] = safePicks.slice(0, 3).map(opt => ({
    type: opt.type,
    label: opt.label,
    probability: opt.probability,
    confidence: opt.confidence,
    odds: Math.round((1 / opt.probability) * 100) / 100,
    reasoning: opt.reasoning,
    selected: false,
  }));

  console.log(`📊 Top 3: ${top3Picks.map(p => `${p.label}(${p.confidence}%)`).join(', ')}`);

  return {
    matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam,
    league: match.league, matchDate: match.matchDate, pick: bestPick,
    safePicks, allOptions: options, riskLevel, top3Picks,
    modelVersion: 'poisson-elo-v5.4-multi-pick',
  };
}

export async function analyzeMatches(matches: MatchForApp[]): Promise<PickResult[]> {
  console.log(`\n🔍 Analizando ${matches.length} partidos...`);
  const results: PickResult[] = [];

  for (const match of matches) {
    try {
      const result = await analyzeMatchAsync(match);
      if (result && result.riskLevel !== 'NO_BET') {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error analizando ${match.homeTeam} vs ${match.awayTeam}:`, error);
    }
  }

  results.sort((a, b) => b.pick.confidence - a.pick.confidence);
  console.log(`\n✅ ${results.length} partidos con picks recomendables`);
  return results;
}

// ==========================================
// COMPATIBILIDAD CON CHAT.TS
// ==========================================
function pickResultToMatchPick(pickResult: PickResult, selectedPickIndices: number[] = [0]): MatchPick {
  const selectedPicks = selectedPickIndices.length > 0 && pickResult.top3Picks.length > 0
    ? selectedPickIndices.map(i => pickResult.top3Picks[i]).filter(Boolean)
    : [pickResult.top3Picks[0] || {
        type: pickResult.pick.type,
        label: pickResult.pick.label,
        probability: pickResult.pick.probability,
        confidence: pickResult.pick.confidence,
        odds: Math.round((1 / pickResult.pick.probability) * 100) / 100,
        reasoning: pickResult.pick.reasoning,
      }];

  const mainPick = selectedPicks[0];

  return {
    matchId: pickResult.matchId,
    homeTeam: pickResult.homeTeam,
    awayTeam: pickResult.awayTeam,
    league: pickResult.league,
    matchDate: pickResult.matchDate,
    pick: mainPick.label,
    odds: mainPick.odds,
    probability: mainPick.probability,
    analysis: mainPick.reasoning.join(' | '),
    score: mainPick.confidence,
    monteCarloProb: mainPick.probability,
    eloDiff: 0,
    xGTotal: 2.7,
    volatility: 100 - mainPick.confidence,
    valueBet: Math.max(0, (mainPick.probability - 0.5) * 100),
    status: 'pending',
    safePicks: pickResult.safePicks.map(s => s.label),
    topPicks: pickResult.top3Picks,
    selectedPickIndices,
  };
}

export function analyzeMatchSync(homeTeamName: string, awayTeamName: string, leagueName?: string): MatchAnalysis {
  const homeStats: TeamStats = {
    teamId: 0, name: homeTeamName, position: 10, played: 10,
    wins: 4, draws: 3, losses: 3, goalsFor: 14, goalsAgainst: 14,
    avgGoalsFor: 1.35, avgGoalsAgainst: 1.35, form: ['W','D','L','W','D'], formScore: 0.5,
  };
  const awayStats: TeamStats = { ...homeStats, name: awayTeamName };

  const poissonResult = calcularPoisson(homeStats, awayStats);
  const eloHome = calcularElo(homeStats);
  const eloAway = calcularElo(awayStats);
  const options = calcularTodasLasApuestas(homeStats, awayStats, poissonResult, eloHome, eloAway);
  options.sort((a, b) => b.confidence - a.confidence);

  const bestPick = options[0];

  return {
    homeTeam: homeTeamName, awayTeam: awayTeamName, league: leagueName || 'Liga Desconocida',
    score: bestPick.confidence, eloDiff: eloHome - eloAway, xGTotal: homeStats.avgGoalsFor + awayStats.avgGoalsFor,
    monteCarloProb: bestPick.probability, volatility: 100 - bestPick.confidence,
    valueBet: Math.max(0, (bestPick.probability - 0.5) * 100),
    bestPick: { label: bestPick.label, probability: bestPick.probability, odds: Math.round((1 / bestPick.probability) * 100) / 100, reasoning: bestPick.reasoning.join(' | ') },
  };
}

export async function generateCombinadaFromMatchesAsync(selectedMatches: MatchForApp[]): Promise<Combinada> {
  console.log(`\n🎯 Generando combinada con ${selectedMatches.length} partidos...`);
  const results = await analyzeMatches(selectedMatches);
  const goodResults = results.filter(r => r.riskLevel === 'LOW' || r.riskLevel === 'MEDIUM');
  const picks = goodResults.map(r => pickResultToMatchPick(r));

  const totalOdds = Math.round(picks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
  const totalProbability = Math.round(picks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
  const avgScore = picks.length > 0 ? Math.round(picks.reduce((acc, p) => acc + p.score, 0) / picks.length) : 0;

  return {
    id: `comb_${Date.now()}`, picks, totalOdds, totalProbability,
    score: avgScore, risk: 'low', status: 'pending', taken: false,
  };
}

export function generateCombinadaFromMatches(selectedMatches: any[]): Combinada {
  return {
    id: `comb_${Date.now()}`, picks: [], totalOdds: 1, totalProbability: 0,
    score: 0, risk: 'low', status: 'pending', taken: false,
  };
}
