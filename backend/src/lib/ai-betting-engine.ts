// Motor de Apuestas - El Dios Yerson
// Motor Matemático v6.1 - Poisson + Monte Carlo + Dixon-Coles + ELO Dinámico
// FILOSOFÍA: No buscamos el pick más rentable, buscamos el más SEGURO.
// MEJORAS v6.1:
// - Poisson con attack/defense strength correcto
// - Dixon-Coles adjustment para empates
// - Monte Carlo con normalización y límite de goles
// - Volatilidad mejorada con xGTotal
// - Filtro de picks: prob > 0.60 Y confidence > 68
// - Mercado automático según xGTotal

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
  attackHome: number;
  defenseHome: number;
  attackAway: number;
  defenseAway: number;
}

export interface MonteCarloResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  over15: number;
  over25: number;
  over35: number;
  under25: number;
  under35: number;
  under45: number;
  btts: number;
  scoreMatrix: Record<string, number>;
  mostLikelyScores: { score: string; prob: number }[];
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
  poissonData?: PoissonResult;
  monteCarloData?: MonteCarloResult;
  homeStats?: TeamStats;
  awayStats?: TeamStats;
  eloHome?: number;
  eloAway?: number;
  volatility?: number;
  xGTotal?: number;
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
// CONSTANTES MEJORADAS v6.1
// ==========================================

// Promedio de goles POR LIGA (datos reales 2024-25)
const LEAGUE_GOAL_FACTORS: Record<string, number> = {
  // === EUROPA - Ligas con más goles ===
  'ger.1': 1.55,      // Bundesliga - mucha goleada
  'ned.1': 1.60,      // Eredivisie - muy ofensiva
  'sui.1': 1.50,      // Super Liga Suiza
  'aut.1': 1.45,      // Austrian Bundesliga
  
  // === EUROPA - Ligas medianas ===
  'eng.1': 1.40,      // Premier League
  'ita.1': 1.25,      // Serie A - más defensiva
  'esp.1': 1.30,      // La Liga
  'fra.1': 1.28,      // Ligue 1
  'por.1': 1.32,      // Primeira Liga
  'tur.1': 1.38,      // Süper Lig
  'bel.1': 1.42,      // Jupiler Pro League
  'sco.1': 1.35,      // Scottish Premiership
  'gre.1': 1.28,      // Greek Super League
  'rus.1': 1.22,      // Russian Premier League
  'nor.1': 1.48,      // Eliteserien
  'swe.1': 1.45,      // Allsvenskan
  
  // === COMPETICIONES UEFA ===
  'uefa.champions': 1.42,  // Champions League
  'uefa.europa': 1.38,     // Europa League
  'uefa.conference': 1.35, // Conference League
  
  // === SUDAMÉRICA ===
  'bra.1': 1.42,      // Brasileirão
  'arg.1': 1.35,      // Liga Argentina
  'col.1': 1.30,      // Liga BetPlay
  'mex.1': 1.45,      // Liga MX
  'chi.1': 1.38,      // Chilean Primera
  'ecu.1': 1.40,      // Ecuadorian Serie A
  'per.1': 1.42,      // Peruvian Liga 1
  'uru.1': 1.35,      // Uruguayan Primera
  'par.1': 1.48,      // Paraguayan Primera
  'ven.1': 1.52,      // Venezuelan Primera
  'bol.1': 1.55,      // Bolivian Primera
  
  // === CONMEBOL ===
  'conmebol.libertadores': 1.38,
  'conmebol.sudamericana': 1.35,
  
  // === NORTE/CENTROAMÉRICA ===
  'usa.1': 1.48,      // MLS
  'crc.1': 1.40,      // Costa Rican Primera
  
  // === ASIA/OCEANÍA ===
  'aus.1': 1.52,      // A-League
  'jpn.1': 1.35,      // J-League
  'chn.1': 1.38,      // Chinese Super League
  'ind.1': 1.45,      // Indian Super League
};

// Ventaja local POR LIGA
const HOME_ADVANTAGE_FACTORS: Record<string, number> = {
  'eng.1': 1.08,
  'ger.1': 1.10,
  'ita.1': 1.12,
  'esp.1': 1.10,
  'fra.1': 1.11,
  'ned.1': 1.07,
  'por.1': 1.12,
  'tur.1': 1.15,
  'bra.1': 1.18,
  'arg.1': 1.20,
  'col.1': 1.18,
  'mex.1': 1.15,
  'uefa.champions': 1.05,
  'uefa.europa': 1.06,
  'conmebol.libertadores': 1.08,
  'default': 1.10,
};

// Dixon-Coles adjustment para empates (mejora precisión en marcadores bajos)
const DIXON_COLES_RHO = 0.06; // Parámetro de correlación

const CACHE_DURATION = 30 * 60 * 1000;
const MONTE_CARLO_SIMS = 10000;
const MAX_GOALS = 6; // Limitado para evitar resultados extremos

// Umbrales mejorados para picks
const MIN_PROBABILITY = 0.60;
const MIN_CONFIDENCE = 68;

// Cache
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
// FUNCIONES MATEMÁTICAS OPTIMIZADAS
// ==========================================
const FACTORIALS: number[] = [1, 1, 2, 6, 24, 120, 720, 5040];

function factorial(n: number): number {
  if (n <= 7) return FACTORIALS[n] || 1;
  let result = 5040;
  for (let i = 8; i <= n; i++) result *= i;
  return result;
}

function poissonProb(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Dixon-Coles adjustment para empates subestimados
function dixonColesAdjustment(homeGoals: number, awayGoals: number, lambdaHome: number, lambdaAway: number, rho: number = DIXON_COLES_RHO): number {
  // Solo aplicar a marcadores bajos (0-0, 1-0, 0-1, 1-1)
  if (homeGoals <= 1 && awayGoals <= 1) {
    let tau = 1;
    
    if (homeGoals === 0 && awayGoals === 0) {
      tau = 1 - lambdaHome * lambdaAway * rho;
    } else if (homeGoals === 1 && awayGoals === 0) {
      tau = 1 + lambdaHome * rho;
    } else if (homeGoals === 0 && awayGoals === 1) {
      tau = 1 + lambdaAway * rho;
    } else if (homeGoals === 1 && awayGoals === 1) {
      tau = 1 - rho;
    }
    
    return Math.max(0, tau);
  }
  
  return 1;
}

// Generar probabilidades con normalización
function generateGoalProbabilities(lambda: number, maxGoals = MAX_GOALS): number[] {
  const probs: number[] = [];
  for (let i = 0; i <= maxGoals; i++) {
    probs.push(poissonProb(lambda, i));
  }
  
  // Normalizar para que sume exactamente 1
  const sum = probs.reduce((a, b) => a + b, 0);
  return probs.map(p => p / sum);
}

function sampleFromDistribution(probs: number[]): number {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r <= cumulative) return i;
  }
  return probs.length - 1;
}

// ==========================================
// MONTE CARLO OPTIMIZADO v6.1
// ==========================================
function monteCarloFast(lambdaHome: number, lambdaAway: number, sims = MONTE_CARLO_SIMS): MonteCarloResult {
  const homeProbs = generateGoalProbabilities(lambdaHome);
  const awayProbs = generateGoalProbabilities(lambdaAway);
  
  let homeWins = 0, draws = 0, awayWins = 0;
  let over15 = 0, over25 = 0, over35 = 0;
  let under25 = 0, under35 = 0, under45 = 0, btts = 0;
  const scoreMatrix: Record<string, number> = {};
  
  for (let i = 0; i < sims; i++) {
    const homeGoals = sampleFromDistribution(homeProbs);
    const awayGoals = sampleFromDistribution(awayProbs);
    
    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals === awayGoals) draws++;
    else awayWins++;
    
    const total = homeGoals + awayGoals;
    if (total > 1.5) over15++;
    if (total > 2.5) over25++;
    if (total > 3.5) over35++;
    if (total < 2.5) under25++;
    if (total < 3.5) under35++;
    if (total < 4.5) under45++;
    if (homeGoals > 0 && awayGoals > 0) btts++;
    
    const key = `${homeGoals}-${awayGoals}`;
    scoreMatrix[key] = (scoreMatrix[key] || 0) + 1;
  }
  
  return {
    homeWin: homeWins / sims,
    draw: draws / sims,
    awayWin: awayWins / sims,
    over15: over15 / sims,
    over25: over25 / sims,
    over35: over35 / sims,
    under25: under25 / sims,
    under35: under35 / sims,
    under45: under45 / sims,
    btts: btts / sims,
    scoreMatrix,
    mostLikelyScores: Object.entries(scoreMatrix)
      .map(([score, count]) => ({ score, prob: count / sims }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5),
  };
}

// ==========================================
// POISSON MEJORADO v6.1 - Attack/Defense Strength
// ==========================================
function calcularPoisson(homeStats: TeamStats, awayStats: TeamStats, leagueCode: string): PoissonResult {
  const leagueFactor = LEAGUE_GOAL_FACTORS[leagueCode] || 1.35;
  const homeAdvantage = HOME_ADVANTAGE_FACTORS[leagueCode] || HOME_ADVANTAGE_FACTORS['default'];
  
  // Attack/Defense Strength (método profesional)
  const attackHome = homeStats.avgGoalsFor / leagueFactor;
  const defenseHome = homeStats.avgGoalsAgainst / leagueFactor;
  const attackAway = awayStats.avgGoalsFor / leagueFactor;
  const defenseAway = awayStats.avgGoalsAgainst / leagueFactor;
  
  // Lambda con attack × defense × league avg
  let lambdaHome = attackHome * defenseAway * leagueFactor * homeAdvantage;
  let lambdaAway = attackAway * defenseHome * leagueFactor;
  
  // Ajuste por forma (máximo ±12%)
  const formAdjustmentHome = 1 + (homeStats.formScore - 0.5) * 0.24;
  const formAdjustmentAway = 1 + (awayStats.formScore - 0.5) * 0.24;
  
  lambdaHome *= formAdjustmentHome;
  lambdaAway *= formAdjustmentAway;
  
  // Matriz Poisson con Dixon-Coles adjustment
  const matrix: number[][] = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    matrix[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      let p = poissonProb(lambdaHome, h) * poissonProb(lambdaAway, a);
      // Aplicar Dixon-Coles para mejorar empates
      p *= dixonColesAdjustment(h, a, lambdaHome, lambdaAway);
      matrix[h][a] = p;
    }
  }
  
  // Normalizar la matriz
  let total = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      total += matrix[h][a];
    }
  }
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      matrix[h][a] /= total;
    }
  }
  
  let probHomeWin = 0, probDraw = 0, probAwayWin = 0;
  let probOver15 = 0, probOver25 = 0, probUnder25 = 0, probUnder35 = 0, probUnder45 = 0, probBTTS = 0;
  
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
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
  
  console.log(`🔢 Poisson v6.1: λHome=${lambdaHome.toFixed(2)}, λAway=${lambdaAway.toFixed(2)}, xG=${(lambdaHome + lambdaAway).toFixed(2)}`);
  console.log(`📊 Attack: Home=${attackHome.toFixed(2)}, Away=${attackAway.toFixed(2)} | Defense: Home=${defenseHome.toFixed(2)}, Away=${defenseAway.toFixed(2)}`);
  
  return { 
    lambdaHome, lambdaAway,
    probHomeWin, probDraw, probAwayWin,
    probOver15, probOver25, probUnder25, probUnder35, probUnder45, probBTTS,
    attackHome, defenseHome, attackAway, defenseAway
  };
}

// ==========================================
// ELO DINÁMICO v6.1
// ==========================================
function calcularElo(stats: TeamStats, base = 1500): number {
  const posicionBonus = Math.max(0, (20 - stats.position) * 12);
  const formaBonus = stats.formScore * 80;
  const diffGoles = stats.played > 0 ? ((stats.goalsFor - stats.goalsAgainst) / stats.played) * 50 : 0;
  const winRate = stats.played > 0 ? stats.wins / stats.played : 0.5;
  const winRateBonus = (winRate - 0.5) * 100;
  
  return base + posicionBonus + formaBonus + diffGoles + winRateBonus;
}

// ==========================================
// VOLATILIDAD MEJORADA v6.1
// ==========================================
function calcularVolatilidad(poissonResult: PoissonResult, homeStats: TeamStats, awayStats: TeamStats): number {
  let volatility = 0;
  
  // ELO cercano = partido parejo
  const eloDiff = Math.abs(calcularElo(homeStats) - calcularElo(awayStats));
  if (eloDiff < 100) volatility += 20;
  if (eloDiff < 50) volatility += 15;
  
  // Lambda muy parecidos
  const lambdaDiff = Math.abs(poissonResult.lambdaHome - poissonResult.lambdaAway);
  if (lambdaDiff < 0.25) volatility += 25;
  if (lambdaDiff < 0.5) volatility += 15;
  
  // Alta probabilidad de empate
  if (poissonResult.probDraw > 0.30) volatility += 15;
  
  // Forma inconsistente
  const formVariance = Math.abs(homeStats.formScore - awayStats.formScore);
  if (formVariance < 0.2) volatility += 10;
  
  // NUEVO: xGTotal muy alto o muy bajo = impredecible
  const xGTotal = poissonResult.lambdaHome + poissonResult.lambdaAway;
  if (xGTotal > 3.5) volatility += 10; // Partido muy ofensivo = caos
  if (xGTotal < 1.8) volatility += 10; // Partido muy defensivo = empate probable
  
  return Math.min(100, volatility);
}

// ==========================================
// CONFIANZA CALIBRADA v6.1
// ==========================================
function calcularConfianza(
  poissonProb: number, 
  eloProb: number, 
  formFactor: number,
  volatility: number
): number {
  const volatilityPenalty = volatility * 0.15 / 100;
  
  const confidence = (
    poissonProb * 0.45 +
    eloProb * 0.30 +
    formFactor * 0.25
  ) - volatilityPenalty;
  
  return Math.round(Math.max(0, Math.min(100, confidence * 100)));
}

// ==========================================
// RAZONAMIENTO MEJORADO v6.1
// ==========================================
function generarRazones(home: TeamStats, away: TeamStats, tipo: string, poissonResult: PoissonResult): string[] {
  const razones: string[] = [];
  const xGTotal = poissonResult.lambdaHome + poissonResult.lambdaAway;
  const xGHome = poissonResult.lambdaHome;
  const xGAway = poissonResult.lambdaAway;

  if (tipo === 'OVER_15') {
    razones.push(`xG esperado: ${xGTotal.toFixed(2)} goles`);
    razones.push(`Attack strength: ${home.name} ${(poissonResult.attackHome * 100).toFixed(0)}%, ${away.name} ${(poissonResult.attackAway * 100).toFixed(0)}%`);
    if (xGTotal > 3.0) razones.push('Partido de alta anotación esperado');
  }

  if (tipo === 'UNDER_35') {
    razones.push(`xG total bajo: ${xGTotal.toFixed(2)}`);
    if (poissonResult.defenseHome < 1.0) razones.push(`${home.name} defense strength: ${(poissonResult.defenseHome * 100).toFixed(0)}%`);
    if (poissonResult.defenseAway < 1.0) razones.push(`${away.name} defense strength: ${(poissonResult.defenseAway * 100).toFixed(0)}%`);
    razones.push('Dixon-Coles: empate ajustado');
  }

  if (tipo === 'UNDER_45') {
    razones.push(`xG total: ${xGTotal.toFixed(2)}`);
    razones.push('Marcadores +4.5: <5% probabilidad');
  }

  if (tipo === 'UNDER_25') {
    razones.push(`xG total: ${xGTotal.toFixed(2)} < 2.5`);
    if (xGHome < 1.2) razones.push(`${home.name} xG bajo: ${xGHome.toFixed(2)}`);
    if (xGAway < 1.2) razones.push(`${away.name} xG bajo: ${xGAway.toFixed(2)}`);
  }

  if (tipo === '1X') {
    if (home.formScore > 0.55) razones.push(`${home.name} forma: ${home.form.join('-')}`);
    if (home.position < away.position) razones.push(`${home.name} #${home.position} vs #${away.position}`);
    const prob1X = (poissonResult.probHomeWin + poissonResult.probDraw) * 100;
    razones.push(`Prob 1X: ${prob1X.toFixed(0)}%`);
  }

  if (tipo === 'X2') {
    if (away.formScore > 0.55) razones.push(`${away.name} forma: ${away.form.join('-')}`);
    if (away.position < home.position) razones.push(`${away.name} mejor posición`);
    const probX2 = (poissonResult.probAwayWin + poissonResult.probDraw) * 100;
    razones.push(`Prob X2: ${probX2.toFixed(0)}%`);
  }

  if (razones.length === 0) razones.push('Poisson + Monte Carlo + Dixon-Coles');
  return razones;
}

// ==========================================
// FILTRO DE PICKS MEJORADO v6.1
// ==========================================
function filtrarPicks(options: BetOption[]): BetOption[] {
  return options.filter(o => {
    // Filtro estricto: probabilidad > 60% Y confianza > 68
    if (o.probability < MIN_PROBABILITY) return false;
    if (o.confidence < MIN_CONFIDENCE) return false;
    return true;
  });
}

// ==========================================
// SELECTOR DE PICKS CON MERCADO AUTOMÁTICO
// ==========================================
const PICK_PRIORITY: Record<string, number> = {
  'OVER_15': 100, 'UNDER_35': 95, 'DOUBLE_CHANCE_1X': 90, 'DOUBLE_CHANCE_X2': 90,
  'OVER_25': 85, 'UNDER_25': 80, 'BTTS_YES': 75, 'HOME_WIN': 70, 'AWAY_WIN': 70,
  'BTTS_NO': 65, 'UNDER_45': 50, 'DRAW': 40,
};

function selectBestPick(options: BetOption[], xGTotal: number): BetOption {
  // Primero filtrar por umbrales
  const safeOptions = filtrarPicks(options);
  
  if (safeOptions.length === 0) {
    // Si ningún pick pasa el filtro, tomar el de mayor confianza
    return options.reduce((best, curr) => curr.confidence > best.confidence ? curr : best);
  }
  
  // Ordenar por prioridad Y contexto de xG
  safeOptions.sort((a, b) => {
    // Si xGTotal alto, favorecer OVER
    if (xGTotal > 3.2) {
      if (a.type === 'OVER_15' || a.type === 'OVER_25') return -1;
      if (b.type === 'OVER_15' || b.type === 'OVER_25') return 1;
    }
    
    // Si xGTotal bajo, favorecer UNDER
    if (xGTotal < 2.1) {
      if (a.type === 'UNDER_25' || a.type === 'UNDER_35') return -1;
      if (b.type === 'UNDER_25' || b.type === 'UNDER_35') return 1;
    }
    
    // Orden normal por prioridad
    const priorityA = PICK_PRIORITY[a.type] || 50;
    const priorityB = PICK_PRIORITY[b.type] || 50;
    if (priorityA !== priorityB) return priorityB - priorityA;
    return b.confidence - a.confidence;
  });
  
  return safeOptions[0];
}

// ==========================================
// CAPA DE DATOS: ESPN
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

    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard?dates=${start}-${end}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return teamGoals;

    const data: any = await res.json();
    for (const event of data.events || []) {
      if (!event.status?.type?.completed) continue;
      const competitors = event.competitions?.[0]?.competitors || [];
      if (competitors.length < 2) continue;

      for (const comp of competitors) {
        const name = comp.team?.displayName?.toLowerCase();
        if (!name) continue;
        const gf = parseInt(comp.score?.value || '0');
        const rival = competitors.find((c: any) => c.team?.id !== comp.team?.id);
        const ga = parseInt(rival?.score?.value || '0');
        let result = 'D';
        if (gf > ga) result = 'W';
        else if (gf < ga) result = 'L';

        const current = teamGoals.get(name) || { goalsFor: 0, goalsAgainst: 0, played: 0, wins: 0, draws: 0, losses: 0, position: 10 };
        teamGoals.set(name, {
          goalsFor: current.goalsFor + gf, goalsAgainst: current.goalsAgainst + ga,
          played: current.played + 1, wins: current.wins + (result === 'W' ? 1 : 0),
          draws: current.draws + (result === 'D' ? 1 : 0), losses: current.losses + (result === 'L' ? 1 : 0),
          position: current.position
        });
      }
    }

    competitionHistoryCache.set(leagueCode, teamGoals);
    competitionHistoryCacheTime.set(leagueCode, Date.now());
  } catch (error: any) {
    console.error(`❌ Error historial:`, error.message);
  }
  return teamGoals;
}

async function getGoalsFromESPNStandings(leagueCode: string): Promise<Map<string, TeamGoals>> {
  const result = new Map<string, TeamGoals>();
  const cached = goalsCache.get(leagueCode);
  const cachedTime = goalsCacheTime.get(leagueCode);
  if (cached && cachedTime && Date.now() - cachedTime < CACHE_DURATION) return cached;

  try {
    const res = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return result;

    const data: any = await res.json();
    let entries = data.standings?.entries || [];
    if (entries.length === 0 && data.children) {
      for (const child of data.children) {
        if (child.standings?.entries?.length > 0) entries = entries.concat(child.standings.entries);
      }
    }

    for (const entry of entries) {
      const teamName = entry.team?.displayName?.toLowerCase() || '';
      const stats = entry.stats || [];
      const getStat = (n: string) => stats.find((s: any) => s.name === n)?.value || 0;

      const goalsFor = getStat('pointsFor') || getStat('goalsFor') || getStat('goalsScored') || 0;
      const goalsAgainst = getStat('pointsAgainst') || getStat('goalsAgainst') || getStat('goalsConceded') || 0;
      const wins = getStat('wins') || 0;
      const losses = getStat('losses') || 0;
      const draws = getStat('ties') || getStat('draws') || 0;
      const played = getStat('gamesPlayed') || wins + draws + losses;
      const position = getStat('rank') || 10;

      if (teamName && (goalsFor > 0 || goalsAgainst > 0)) {
        result.set(teamName, { goalsFor, goalsAgainst, played, wins, draws, losses, position });
      }
    }

    goalsCache.set(leagueCode, result);
    goalsCacheTime.set(leagueCode, Date.now());
  } catch (error: any) {
    console.error(`❌ Error Standings:`, error.message);
  }
  return result;
}

async function extractTeamStats(competitor: any, leagueCode?: string): Promise<TeamStats | null> {
  if (!competitor) return null;
  const teamId = parseInt(competitor.team?.id || '0');
  const teamName = competitor.team?.displayName?.toLowerCase() || '';

  // Nivel 1: Stats directas
  if (competitor.statistics?.length > 0) {
    const stats = competitor.statistics;
    const records = competitor.records || [];
    const recordParts = (records.find((r: any) => r.type === 'total')?.summary || '0-0-0').split('-').map((n: string) => parseInt(n) || 0);
    const wins = recordParts[0] || 0, draws = recordParts[1] || 0, losses = recordParts[2] || 0;
    const played = wins + draws + losses || 1;
    const getStat = (n: string) => { const s = stats.find((x: any) => x.name === n); return s ? parseFloat(s.value) || 0 : 0; };
    const goalsFor = getStat('totalGoals') || getStat('goalsScored') || 0;
    const goalsAgainst = getStat('goalsConceded') || 0;

    if (goalsFor > 0 || goalsAgainst > 0) {
      const form = competitor.form?.toUpperCase().split('').slice(-5) || [];
      const formScore = form.length > 0 ? form.reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15 : 0.5;
      return { teamId, name: competitor.team?.displayName || 'Desconocido', position: getStat('rank') || 10, played, wins, draws, losses, goalsFor, goalsAgainst, avgGoalsFor: played > 0 ? goalsFor / played : 1.35, avgGoalsAgainst: played > 0 ? goalsAgainst / played : 1.35, form, formScore };
    }
  }

  // Nivel 2: ESPN Standings
  if (leagueCode) {
    const leagueGoals = await getGoalsFromESPNStandings(leagueCode);
    let realGoals = leagueGoals.get(teamName);
    if (!realGoals) {
      for (const [name, data] of Array.from(leagueGoals.entries())) {
        if (name.includes(teamName) || teamName.includes(name)) { realGoals = data; break; }
      }
    }
    if (realGoals && (realGoals.goalsFor > 0 || realGoals.goalsAgainst > 0)) {
      const form = competitor.form?.toUpperCase().split('').slice(-5) || [];
      const formScore = form.length > 0 ? form.reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15 : 0.5;
      const played = realGoals.played || 1;
      return { teamId, name: competitor.team?.displayName || 'Desconocido', position: realGoals.position || 10, played, wins: realGoals.wins || 0, draws: realGoals.draws || 0, losses: realGoals.losses || 0, goalsFor: realGoals.goalsFor, goalsAgainst: realGoals.goalsAgainst, avgGoalsFor: played > 0 ? realGoals.goalsFor / played : 1.35, avgGoalsAgainst: played > 0 ? realGoals.goalsAgainst / played : 1.35, form, formScore };
    }
  }

  // Nivel 3: Historial
  if (leagueCode && COMPETITION_HISTORY_LEAGUES.includes(leagueCode)) {
    const historyGoals = await getGoalsFromCompetitionHistory(leagueCode);
    let teamHistory = historyGoals.get(teamName);
    if (!teamHistory) {
      for (const [name, data] of Array.from(historyGoals.entries())) {
        if (name.includes(teamName) || teamName.includes(name)) { teamHistory = historyGoals.get(name); if (teamHistory) break; }
      }
    }
    if (teamHistory && teamHistory.played >= 3) {
      const form = competitor.form?.toUpperCase().split('').slice(-5) || [];
      const formScore = form.length > 0 ? form.reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15 : 0.5;
      return { teamId, name: competitor.team?.displayName || 'Desconocido', position: 10, played: teamHistory.played, wins: teamHistory.wins || 0, draws: teamHistory.draws || 0, losses: teamHistory.losses || 0, goalsFor: teamHistory.goalsFor, goalsAgainst: teamHistory.goalsAgainst, avgGoalsFor: teamHistory.goalsFor / teamHistory.played, avgGoalsAgainst: teamHistory.goalsAgainst / teamHistory.played, form, formScore };
    }
    return null;
  }
  return null;
}

// ==========================================
// CALCULAR TODAS LAS APUESTAS
// ==========================================
function calcularTodasLasApuestas(
  home: TeamStats, away: TeamStats, p: PoissonResult, mc: MonteCarloResult,
  eloHome: number, eloAway: number, volatility: number
): BetOption[] {
  const eloProb = 1 / (1 + Math.pow(10, (eloAway - eloHome) / 400));
  const golesPromedio = home.avgGoalsFor + away.avgGoalsFor;

  return [
    { type: 'HOME_WIN', probability: mc.homeWin, confidence: calcularConfianza(mc.homeWin, eloProb, home.formScore, volatility), label: 'Gana local', reasoning: generarRazones(home, away, 'HOME', p) },
    { type: 'AWAY_WIN', probability: mc.awayWin, confidence: calcularConfianza(mc.awayWin, 1 - eloProb, away.formScore, volatility), label: 'Gana visitante', reasoning: generarRazones(home, away, 'AWAY', p) },
    { type: 'DRAW', probability: mc.draw, confidence: calcularConfianza(mc.draw, 0.3, 0.4, volatility), label: 'Empate', reasoning: generarRazones(home, away, 'DRAW', p) },
    { type: 'DOUBLE_CHANCE_1X', probability: mc.homeWin + mc.draw, confidence: calcularConfianza(mc.homeWin + mc.draw, Math.min(1, eloProb + 0.15), home.formScore, volatility), label: 'Gana o empata local (1X)', reasoning: generarRazones(home, away, '1X', p) },
    { type: 'DOUBLE_CHANCE_X2', probability: mc.awayWin + mc.draw, confidence: calcularConfianza(mc.awayWin + mc.draw, Math.min(1, 1 - eloProb + 0.15), away.formScore, volatility), label: 'Gana o empata visitante (X2)', reasoning: generarRazones(home, away, 'X2', p) },
    { type: 'OVER_15', probability: mc.over15, confidence: calcularConfianza(mc.over15, 0.5, Math.min(1, golesPromedio / 4), volatility), label: 'Más de 1.5 goles', reasoning: generarRazones(home, away, 'OVER_15', p) },
    { type: 'OVER_25', probability: mc.over25, confidence: calcularConfianza(mc.over25, 0.5, Math.min(1, golesPromedio / 5), volatility), label: 'Más de 2.5 goles', reasoning: generarRazones(home, away, 'OVER_25', p) },
    { type: 'UNDER_25', probability: mc.under25, confidence: calcularConfianza(mc.under25, 0.5, Math.max(0, 1 - golesPromedio / 5), volatility), label: 'Menos de 2.5 goles', reasoning: generarRazones(home, away, 'UNDER_25', p) },
    { type: 'UNDER_35', probability: mc.under35, confidence: calcularConfianza(mc.under35, 0.65, Math.max(0, 1 - golesPromedio / 6), volatility), label: 'Menos de 3.5 goles', reasoning: generarRazones(home, away, 'UNDER_35', p) },
    { type: 'UNDER_45', probability: mc.under45, confidence: calcularConfianza(mc.under45, 0.80, Math.max(0, 1 - golesPromedio / 8), volatility), label: 'Menos de 4.5 goles', reasoning: generarRazones(home, away, 'UNDER_45', p) },
    { type: 'BTTS_YES', probability: mc.btts, confidence: calcularConfianza(mc.btts, 0.5, Math.min(1, (home.avgGoalsFor + away.avgGoalsFor) / 6), volatility), label: 'Ambos equipos anotan', reasoning: generarRazones(home, away, 'BTTS', p) },
    { type: 'BTTS_NO', probability: 1 - mc.btts, confidence: calcularConfianza(1 - mc.btts, 0.5, Math.max(0, 1 - (home.avgGoalsFor + away.avgGoalsFor) / 6), volatility), label: 'No anotan ambos equipos', reasoning: generarRazones(home, away, 'BTTS_NO', p) },
  ];
}

// ==========================================
// ANÁLISIS PRINCIPAL v6.1
// ==========================================
export async function analyzeMatchAsync(match: MatchForApp): Promise<PickResult | null> {
  console.log(`\n🔍 Analizando: ${match.homeTeam} vs ${match.awayTeam}`);
  const leagueCode = LEAGUE_CODE_MAP[match.league] || '';
  console.log(`📍 Liga: ${match.league} (${leagueCode || 'sin código'})`);

  const homeStats = await extractTeamStats(match.homeCompetitorRaw, leagueCode);
  const awayStats = await extractTeamStats(match.awayCompetitorRaw, leagueCode);
  if (!homeStats || !awayStats) { console.log(`❌ Sin datos — OMITIDO`); return null; }

  const poissonResult = calcularPoisson(homeStats, awayStats, leagueCode);
  const monteCarloResult = monteCarloFast(poissonResult.lambdaHome, poissonResult.lambdaAway);
  const eloHome = calcularElo(homeStats);
  const eloAway = calcularElo(awayStats);
  const volatility = calcularVolatilidad(poissonResult, homeStats, awayStats);
  const xGTotal = poissonResult.lambdaHome + poissonResult.lambdaAway;

  const options = calcularTodasLasApuestas(homeStats, awayStats, poissonResult, monteCarloResult, eloHome, eloAway, volatility);
  options.sort((a, b) => b.confidence - a.confidence);

  const bestPick = selectBestPick(options, xGTotal);
  const safePicks = filtrarPicks(options);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_BET';
  if (bestPick.confidence >= 75) riskLevel = 'LOW';
  else if (bestPick.confidence >= 68) riskLevel = 'MEDIUM';
  else if (bestPick.confidence >= 60) riskLevel = 'HIGH';
  else riskLevel = 'NO_BET';

  console.log(`✅ Pick: ${bestPick.label} (${bestPick.confidence}% confianza) - Riesgo: ${riskLevel}`);
  console.log(`📊 xG: ${xGTotal.toFixed(2)} (Home: ${poissonResult.lambdaHome.toFixed(2)}, Away: ${poissonResult.lambdaAway.toFixed(2)})`);
  console.log(`🏆 ELO: ${eloHome.toFixed(0)} vs ${eloAway.toFixed(0)} (diff: ${(eloHome - eloAway).toFixed(0)})`);
  console.log(`⚡ Volatilidad: ${volatility}%`);
  console.log(`🎯 Scores: ${monteCarloResult.mostLikelyScores.map(s => `${s.score}(${(s.prob*100).toFixed(1)}%)`).join(', ')}`);

  return {
    matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam,
    league: match.league, matchDate: match.matchDate, pick: bestPick,
    safePicks, allOptions: options, riskLevel,
    modelVersion: 'poisson-montecarlo-dixon-coles-v6.1',
    poissonData: poissonResult, monteCarloData: monteCarloResult,
    homeStats, awayStats, eloHome, eloAway, volatility, xGTotal,
  };
}

export async function analyzeMatches(matches: MatchForApp[]): Promise<PickResult[]> {
  console.log(`\n🔍 Analizando ${matches.length} partidos...`);
  const results: PickResult[] = [];
  for (const match of matches) {
    try {
      const result = await analyzeMatchAsync(match);
      if (result && result.riskLevel !== 'NO_BET') results.push(result);
    } catch (error) { console.error(`Error:`, error); }
  }
  results.sort((a, b) => b.pick.confidence - a.pick.confidence);
  console.log(`\n✅ ${results.length} picks recomendables`);
  return results;
}

// ==========================================
// COMPATIBILIDAD
// ==========================================
function pickResultToMatchPick(pickResult: PickResult): MatchPick {
  const xGTotal = pickResult.xGTotal || pickResult.poissonData?.lambdaHome && pickResult.poissonData?.lambdaAway 
    ? pickResult.poissonData.lambdaHome + pickResult.poissonData.lambdaAway : 2.7;
  const eloDiff = (pickResult.eloHome && pickResult.eloAway) ? pickResult.eloHome - pickResult.eloAway : 0;
  const odds = Math.round((1 / pickResult.pick.probability) * 0.95 * 100) / 100;

  return {
    matchId: pickResult.matchId, homeTeam: pickResult.homeTeam, awayTeam: pickResult.awayTeam,
    league: pickResult.league, matchDate: pickResult.matchDate, pick: pickResult.pick.label,
    odds, probability: pickResult.pick.probability, analysis: pickResult.pick.reasoning.join(' | '),
    score: pickResult.pick.confidence, monteCarloProb: pickResult.pick.probability, eloDiff,
    xGTotal: Math.round(xGTotal * 10) / 10, volatility: pickResult.volatility || 100 - pickResult.pick.confidence,
    valueBet: Math.max(0, (pickResult.pick.probability - 0.5) * 100), status: 'pending',
    safePicks: pickResult.safePicks.map(s => s.label),
  };
}

export function analyzeMatchSync(homeTeamName: string, awayTeamName: string, leagueName?: string): MatchAnalysis {
  const homeStats: TeamStats = { teamId: 0, name: homeTeamName, position: 10, played: 10, wins: 4, draws: 3, losses: 3, goalsFor: 14, goalsAgainst: 14, avgGoalsFor: 1.35, avgGoalsAgainst: 1.35, form: ['W','D','L','W','D'], formScore: 0.5 };
  const awayStats: TeamStats = { ...homeStats, name: awayTeamName };
  const poissonResult = calcularPoisson(homeStats, awayStats, 'eng.1');
  const monteCarloResult = monteCarloFast(poissonResult.lambdaHome, poissonResult.lambdaAway, 5000);
  const eloHome = calcularElo(homeStats), eloAway = calcularElo(awayStats);
  const volatility = calcularVolatilidad(poissonResult, homeStats, awayStats);
  const options = calcularTodasLasApuestas(homeStats, awayStats, poissonResult, monteCarloResult, eloHome, eloAway, volatility);
  options.sort((a, b) => b.confidence - a.confidence);
  const bestPick = options[0];

  return {
    homeTeam: homeTeamName, awayTeam: awayTeamName, league: leagueName || 'Liga Desconocida',
    score: bestPick.confidence, eloDiff: eloHome - eloAway, xGTotal: poissonResult.lambdaHome + poissonResult.lambdaAway,
    monteCarloProb: bestPick.probability, volatility,
    valueBet: Math.max(0, (bestPick.probability - 0.5) * 100),
    bestPick: { label: bestPick.label, probability: bestPick.probability, odds: Math.round((1 / bestPick.probability) * 100) / 100, reasoning: bestPick.reasoning.join(' | ') },
  };
}

export async function generateCombinadaFromMatchesAsync(selectedMatches: MatchForApp[]): Promise<Combinada> {
  console.log(`\n🎯 Generando combinada con ${selectedMatches.length} partidos...`);
  const results = await analyzeMatches(selectedMatches);
  const goodResults = results.filter(r => r.riskLevel === 'LOW' || r.riskLevel === 'MEDIUM');
  const picks = goodResults.map(pickResultToMatchPick);
  const totalOdds = Math.round(picks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
  const totalProbability = Math.round(picks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
  const avgScore = picks.length > 0 ? Math.round(picks.reduce((acc, p) => acc + p.score, 0) / picks.length) : 0;

  return { id: `comb_${Date.now()}`, picks, totalOdds, totalProbability, score: avgScore, risk: 'low', status: 'pending', taken: false };
}

export function generateCombinadaFromMatches(selectedMatches: any[]): Combinada {
  return { id: `comb_${Date.now()}`, picks: [], totalOdds: 1, totalProbability: 0, score: 0, risk: 'low', status: 'pending', taken: false };
}
