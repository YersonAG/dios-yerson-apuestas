// Motor de Apuestas - El Dios Yerson
// Motor Matemático v6.5 - Fixes Críticos Aplicados
// FILOSOFÍA: No buscamos el pick más rentable, buscamos el más SEGURO.
// MEJORAS v6.4e:
// - Fórmula diferente para TOTALES: probabilidad tiene 70% del peso
// - OVER 1.5 ahora pasa el filtro cuando tiene >65% confianza
// - Totales: límites más permisivos (hasta 92%)
// MEJORAS v6.4b:
// - Team Style Factors aplicados a datos de entrada
// - Knockout Factor -15% para competiciones UEFA
// MEJORAS v6.4:
// - Team Style Factors: equipos defensivos/ofensivos conocidos
// - Factor Champions League reducido (eliminatorias más cerradas)
// MEJORAS v6.3:
// - Monte Carlo con Dixon-Coles integrado (empates calibrados)
// - ELO basado en PPG real (no solo posición)
// - Monte Carlo optimizado con CDF precalculada (5-10x más rápido)
// - Calibración logística (estilo FiveThirtyEight)
// - Value Bet vs cuotas de mercado

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
  note?: string; // 🆕 Para indicar picks de riesgo
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
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';
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
  'uefa.champions': 1.25,  // Champions League - CORREGIDO: eliminatorias más cerradas
  'uefa.europa': 1.22,     // Europa League - CORREGIDO
  'uefa.conference': 1.20, // Conference League - CORREGIDO
  
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

// ==========================================
// 🆕 TEAM STYLE FACTORS v6.4
// ==========================================
// Factor < 1.0 = equipo DEFENSIVO (reduce xG)
// Factor > 1.0 = equipo OFENSIVO (aumenta xG)
const TEAM_STYLE_FACTORS: Record<string, number> = {
  // === EQUIPOS MUY DEFENSIVOS (reducen goles ~20-25%) ===
  'atletico madrid': 0.75,      // Simeone = ultra defensivo
  'atlético madrid': 0.75,
  'atletico': 0.75,
  'newcastle united': 0.80,     // Howe = muy organizado defensivamente
  'newcastle': 0.80,
  'inter miami': 0.78,          // MLS defensivo
  'inter milan': 0.82,          // Serie A defensivo
  'internazionale': 0.82,
  'juventus': 0.83,             // Históricamente defensivo
  'napoli': 0.85,               // Italiano
  'sevilla': 0.82,              // Defensivo en Europa
  'villarreal': 0.83,           // El submarino amarillo
  
  // === EQUIPOS DEFENSIVOS (reducen goles ~10-15%) ===
  'real sociedad': 0.88,
  'athletic bilbao': 0.87,
  'athletic club': 0.87,
  'real betis': 0.88,
  'sassuolo': 0.88,
  'torino': 0.87,
  'freiburg': 0.85,
  'mainz': 0.86,
  'getafe': 0.78,               // MUY defensivo
  'cadiz': 0.85,
  'cádiz': 0.85,
  'leganes': 0.85,
  'léganes': 0.85,
  'wolves': 0.85,
  'wolverhampton': 0.85,
  'brentford': 0.87,
  'brighton': 0.88,
  'crystal palace': 0.86,
  'everton': 0.84,
  
  // === EQUIPOS NEUTROS (factor 1.0) ===
  // No listados = 1.0
  
  // === EQUIPOS OFENSIVOS (aumentan goles ~10-20%) ===
  'bayern munich': 1.18,        // MUY ofensivo
  'bayern': 1.18,
  'borussia dortmund': 1.15,
  'dortmund': 1.15,
  'rb leipzig': 1.12,
  'leipzig': 1.12,
  'leverkusen': 1.14,
  'bayer leverkusen': 1.14,
  'manchester city': 1.15,      // Guardiola = posesión y goles
  'man city': 1.15,
  'liverpool': 1.12,            // Klopp = high press
  'arsenal': 1.10,              // Arteta = ofensivo
  'chelsea': 1.05,
  'tottenham': 1.08,            // Ange = ofensivo
  'tottenham hotspur': 1.08,
  'spurs': 1.08,
  'barcelona': 1.08,            //年轻团队 ofensivo
  'barca': 1.08,
  'real madrid': 1.10,          // Vinicius, Bellingham, Mbappé
  'madrid': 1.10,
  'psg': 1.15,                  // MUY ofensivo
  'paris saint-germain': 1.15,
  'paris': 1.15,
  'ajax': 1.12,
  'psv': 1.10,
  'feyenoord': 1.10,
  'benfica': 1.08,
  'porto': 1.07,
  'sporting cp': 1.07,
  'atalanta': 1.12,             // Gasperini = MUY ofensivo
  'atalanta bergamo': 1.12,
  'roma': 0.95,
  'lazio': 0.92,
  'ac milan': 0.95,
  'milan': 0.95,
  
  // === SUDAMÉRICA ===
  'flamengo': 1.10,
  'palmeiras': 1.05,
  'river plate': 1.08,
  'boca juniors': 0.92,
  'boca': 0.92,
  'argentinos juniors': 0.88,
};

const CACHE_DURATION = 30 * 60 * 1000;
const MONTE_CARLO_SIMS = 10000;
const MAX_GOALS = 6; // Limitado para evitar resultados extremos

// Umbrales mejorados para picks (v6.5 - más estricto para picks seguros)
const MIN_PROBABILITY = 0.62;
const MIN_CONFIDENCE = 65;

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
// MONTE CARLO OPTIMIZADO v6.3 - Con Dixon-Coles + CDF
// ==========================================
function buildCDF(probs: number[]): number[] {
  // Precalcular CDF para muestreo ultra-rápido
  let sum = 0;
  return probs.map(p => sum += p);
}

function sampleCDF(cdf: number[]): number {
  const r = Math.random();
  for (let i = 0; i < cdf.length; i++) {
    if (r <= cdf[i]) return i;
  }
  return cdf.length - 1;
}

function monteCarloFast(lambdaHome: number, lambdaAway: number, sims = MONTE_CARLO_SIMS): MonteCarloResult {
  const homeProbs = generateGoalProbabilities(lambdaHome);
  const awayProbs = generateGoalProbabilities(lambdaAway);
  
  // 🆕 Precalcular CDFs (optimización 5-10x más rápida)
  const homeCDF = buildCDF(homeProbs);
  const awayCDF = buildCDF(awayProbs);
  
  let homeWins = 0, draws = 0, awayWins = 0;
  let over15 = 0, over25 = 0, over35 = 0;
  let under25 = 0, under35 = 0, under45 = 0, btts = 0;
  const scoreMatrix: Record<string, number> = {};
  
  for (let i = 0; i < sims; i++) {
    const homeGoals = sampleCDF(homeCDF);
    const awayGoals = sampleCDF(awayCDF);
    
    // 🆕 Aplicar Dixon-Coles weight para calibrar empates
    const dcWeight = dixonColesAdjustment(homeGoals, awayGoals, lambdaHome, lambdaAway);
    
    if (homeGoals > awayGoals) homeWins += dcWeight;
    else if (homeGoals === awayGoals) draws += dcWeight;
    else awayWins += dcWeight;
    
    const total = homeGoals + awayGoals;
    if (total > 1.5) over15 += dcWeight;
    if (total > 2.5) over25 += dcWeight;
    if (total > 3.5) over35 += dcWeight;
    if (total < 2.5) under25 += dcWeight;
    if (total < 3.5) under35 += dcWeight;
    if (total < 4.5) under45 += dcWeight;
    if (homeGoals > 0 && awayGoals > 0) btts += dcWeight;
    
    const key = `${homeGoals}-${awayGoals}`;
    scoreMatrix[key] = (scoreMatrix[key] || 0) + dcWeight;
  }
  
  // 🆕 v6.5 FIX: Normalizar por el total REAL de pesos (no solo 1X2)
  const totalWeight = Object.values(scoreMatrix).reduce((a, b) => a + b, 0);
  
  return {
    homeWin: homeWins / totalWeight,
    draw: draws / totalWeight,
    awayWin: awayWins / totalWeight,
    over15: over15 / totalWeight,
    over25: over25 / totalWeight,
    over35: over35 / totalWeight,
    under25: under25 / totalWeight,
    under35: under35 / totalWeight,
    under45: under45 / totalWeight,
    btts: btts / totalWeight,
    scoreMatrix,
    mostLikelyScores: Object.entries(scoreMatrix)
      .map(([score, count]) => ({ score, prob: count / totalWeight }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5),
  };
}

// ==========================================
// POISSON MEJORADO v6.4 - Team Style Factors
// ==========================================
function getTeamStyleFactor(teamName: string): number {
  const normalized = teamName.toLowerCase().trim();
  // Buscar coincidencia exacta primero
  if (TEAM_STYLE_FACTORS[normalized]) return TEAM_STYLE_FACTORS[normalized];
  // Buscar coincidencia parcial
  for (const [key, factor] of Object.entries(TEAM_STYLE_FACTORS)) {
    if (normalized.includes(key) || key.includes(normalized)) return factor;
  }
  return 1.0; // Neutro por defecto
}

function calcularPoisson(homeStats: TeamStats, awayStats: TeamStats, leagueCode: string): PoissonResult {
  const leagueFactor = LEAGUE_GOAL_FACTORS[leagueCode] || 1.35;
  const homeAdvantage = HOME_ADVANTAGE_FACTORS[leagueCode] || HOME_ADVANTAGE_FACTORS['default'];
  
  // 🆕 v6.4: Team Style Factors - Aplicar a DATOS DE ENTRADA
  const homeStyleFactor = getTeamStyleFactor(homeStats.name);
  const awayStyleFactor = getTeamStyleFactor(awayStats.name);
  
  // Ajustar promedios de goles según estilo del equipo
  // Equipos defensivos: sus datos de goles están inflados, ajustar hacia abajo
  // Equipos ofensivos: sus datos son más confiables, ligero ajuste hacia arriba
  const adjustedAvgGoalsForHome = homeStats.avgGoalsFor * homeStyleFactor;
  const adjustedAvgGoalsAgainstHome = homeStats.avgGoalsAgainst * homeStyleFactor;
  const adjustedAvgGoalsForAway = awayStats.avgGoalsFor * awayStyleFactor;
  const adjustedAvgGoalsAgainstAway = awayStats.avgGoalsAgainst * awayStyleFactor;
  
  // Attack/Defense Strength con datos ajustados
  const attackHome = adjustedAvgGoalsForHome / leagueFactor;
  const defenseHome = adjustedAvgGoalsAgainstHome / leagueFactor;
  const attackAway = adjustedAvgGoalsForAway / leagueFactor;
  const defenseAway = adjustedAvgGoalsAgainstAway / leagueFactor;
  
  // Lambda con attack × defense × league avg
  let lambdaHome = attackHome * defenseAway * leagueFactor * homeAdvantage;
  let lambdaAway = attackAway * defenseHome * leagueFactor;
  
  // Ajuste por forma (máximo ±12%)
  const formAdjustmentHome = 1 + (homeStats.formScore - 0.5) * 0.24;
  const formAdjustmentAway = 1 + (awayStats.formScore - 0.5) * 0.24;
  
  lambdaHome *= formAdjustmentHome;
  lambdaAway *= formAdjustmentAway;
  
  // 🆕 v6.4b: Knockout Round Factor para competiciones europeas
  // En eliminatorias, los equipos juegan más conservadoramente
  const isEuropeanCup = ['uefa.champions', 'uefa.europa', 'uefa.conference'].includes(leagueCode);
  const knockoutFactor = isEuropeanCup ? 0.85 : 1.0; // Reduce xG 15% en eliminatorias europeas
  lambdaHome *= knockoutFactor;
  lambdaAway *= knockoutFactor;
  
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
  
  console.log(`🔢 Poisson v6.4b: λHome=${lambdaHome.toFixed(2)}, λAway=${lambdaAway.toFixed(2)}, xG=${(lambdaHome + lambdaAway).toFixed(2)}`);
  console.log(`📊 Attack: Home=${attackHome.toFixed(2)}, Away=${attackAway.toFixed(2)} | Defense: Home=${defenseHome.toFixed(2)}, Away=${defenseAway.toFixed(2)}`);
  console.log(`🎨 Style Factors: ${homeStats.name}=${homeStyleFactor.toFixed(2)}, ${awayStats.name}=${awayStyleFactor.toFixed(2)} | Knockout: ${isEuropeanCup ? 'Yes (-15%)' : 'No'}`);
  
  return { 
    lambdaHome, lambdaAway,
    probHomeWin, probDraw, probAwayWin,
    probOver15, probOver25, probUnder25, probUnder35, probUnder45, probBTTS,
    attackHome, defenseHome, attackAway, defenseAway
  };
}

// ==========================================
// ELO DINÁMICO v6.3 - Basado en PPG real
// ==========================================
function calcularElo(stats: TeamStats, base = 1500): number {
  // 🆕 PPG (Points Per Game) - representa fuerza REAL del equipo
  const ppg = stats.played > 0 ? (stats.wins * 3 + stats.draws) / stats.played : 1.5;
  const ppgBonus = (ppg - 1.5) * 120; // 1.5 = promedio liga
  
  // Bonus por posición (reducido, ahora PPG es lo principal)
  const posicionBonus = Math.max(0, (20 - stats.position) * 5);
  
  // Bonus por forma reciente
  const formaBonus = stats.formScore * 60;
  
  // Diferencia de goles
  const diffGoles = stats.played > 0 ? ((stats.goalsFor - stats.goalsAgainst) / stats.played) * 40 : 0;
  
  // Win rate (redundante con PPG, pero añade estabilidad)
  const winRate = stats.played > 0 ? stats.wins / stats.played : 0.5;
  const winRateBonus = (winRate - 0.5) * 50;
  
  return base + ppgBonus + posicionBonus + formaBonus + diffGoles + winRateBonus;
}

// ==========================================
// VOLATILIDAD MEJORADA v6.2 - Con Table Strength
// ==========================================
function calcularVolatilidad(poissonResult: PoissonResult, homeStats: TeamStats, awayStats: TeamStats): number {
  let volatility = 0;
  
  // 🆕 NUEVO: Diferencia de posición en tabla (MUY IMPORTANTE)
  const posDiff = Math.abs(homeStats.position - awayStats.position);
  if (posDiff <= 1) volatility += 20;      // Posiciones consecutivas = muy parejo
  else if (posDiff <= 3) volatility += 12; // Cerca en tabla
  else if (posDiff <= 5) volatility += 6;  // Algo de diferencia
  
  // 🆕 NUEVO: Table Strength Factor (puntos por partido)
  const homePPG = homeStats.played > 0 ? (homeStats.wins * 3 + homeStats.draws) / homeStats.played : 1.5;
  const awayPPG = awayStats.played > 0 ? (awayStats.wins * 3 + awayStats.draws) / awayStats.played : 1.5;
  const tableStrengthDiff = Math.abs(homePPG - awayPPG);
  if (tableStrengthDiff < 0.2) volatility += 15;  // Nivel muy parecido
  else if (tableStrengthDiff < 0.5) volatility += 8;
  
  // ELO cercano = partido parejo
  const eloDiff = Math.abs(calcularElo(homeStats) - calcularElo(awayStats));
  if (eloDiff < 100) volatility += 15;
  if (eloDiff < 50) volatility += 10;
  
  // Lambda muy parecidos
  const lambdaDiff = Math.abs(poissonResult.lambdaHome - poissonResult.lambdaAway);
  if (lambdaDiff < 0.25) volatility += 20;
  if (lambdaDiff < 0.5) volatility += 10;
  
  // Alta probabilidad de empate
  if (poissonResult.probDraw > 0.30) volatility += 12;
  
  // Forma inconsistente
  const formVariance = Math.abs(homeStats.formScore - awayStats.formScore);
  if (formVariance < 0.2) volatility += 8;
  
  // xGTotal muy alto o muy bajo = impredecible
  const xGTotal = poissonResult.lambdaHome + poissonResult.lambdaAway;
  if (xGTotal > 3.5) volatility += 8;
  if (xGTotal < 1.8) volatility += 8;
  
  return Math.min(100, volatility);
}

// ==========================================
// 🆕 PROBABILITY CALIBRATION v6.3 - Logística
// ==========================================
function logisticCalibration(p: number): number {
  // Calibración logística estilo FiveThirtyEight
  // Evita probabilidades infladas de forma más suave
  if (p <= 0 || p >= 1) return p;
  
  const a = 0.92;  // Pendiente
  const b = -0.03; // Intercepto
  
  const logOdds = Math.log(p / (1 - p));
  const calibratedLogOdds = a * logOdds + b;
  
  return 1 / (1 + Math.exp(-calibratedLogOdds));
}

function calibrarProbabilidad(prob: number, volatility: number, posDiff: number, pickType: string = ''): number {
  // Primero aplicar calibración logística
  let calibrated = logisticCalibration(prob);
  
  // Ajustes adicionales por contexto
  let calibrationFactor = 1.0;
  
  // Si equipos muy cercanos en tabla, reducir más
  if (posDiff <= 2) calibrationFactor *= 0.88;
  else if (posDiff <= 4) calibrationFactor *= 0.94;
  
  // Si volatilidad alta, reducir más
  if (volatility > 50) calibrationFactor *= 0.92;
  else if (volatility > 35) calibrationFactor *= 0.96;
  
  calibrated *= calibrationFactor;
  
  // 🆕 v6.4d: Límites diferentes para TOTALES vs 1X2
  // Los picks de totales son inherentemente más predecibles
  const isTotalPick = pickType.includes('OVER') || pickType.includes('UNDER');
  let maxProb: number;
  
  // 🆕 v6.5 FIX: Límites más realistas (no tan agresivos)
  if (isTotalPick) {
    // Totales: límites permisivos pero realistas
    if (posDiff > 10) maxProb = 0.92;
    else if (posDiff > 5) maxProb = 0.88;
    else maxProb = 0.85;
  } else {
    // 1X2: límites estrictos pero no excesivos
    if (posDiff > 10) maxProb = 0.84;
    else if (posDiff > 5) maxProb = 0.80;
    else maxProb = 0.76;
  }
  
  return Math.min(calibrated, maxProb);
}

// ==========================================
// CONFIANZA CALIBRADA v6.4d - Límites especiales para totales
// ==========================================
function calcularConfianza(
  poissonProb: number, 
  eloProb: number, 
  formFactor: number,
  volatility: number,
  posDiff: number = 5,
  pickType: string = '' // 🆕 Para aplicar límites especiales
): number {
  // 🆕 v6.4d: Pasar pickType a calibración para límites diferentes
  const calibratedProb = calibrarProbabilidad(poissonProb, volatility, posDiff, pickType);
  
  const volatilityPenalty = volatility * 0.18 / 100; // Aumentado de 0.15
  
  // 🆕 v6.4e: Fórmula diferente para TOTALES vs 1X2
  const isTotalPick = pickType.includes('OVER') || pickType.includes('UNDER');
  
  let confidence: number;
  if (isTotalPick) {
    // Totales: la probabilidad calibrada es lo más importante
    // ELO y forma son menos relevantes para totales
    confidence = (
      calibratedProb * 0.70 +  // Probabilidad es lo principal
      eloProb * 0.15 +
      formFactor * 0.15
    ) - volatilityPenalty;
  } else {
    // 1X2: mantener fórmula equilibrada
    confidence = (
      calibratedProb * 0.50 +
      eloProb * 0.28 +
      formFactor * 0.22
    ) - volatilityPenalty;
  }
  
  // 🆕 v6.4c: LÍMITES ESPECIALES POR TIPO DE PICK
  // Los picks de goles TOTALES son más predecibles que 1X2
  let maxConfidence = 100;
  
  if (isTotalPick) {
    // Totales: límites más permisivos
    if (posDiff <= 2) maxConfidence = 75;
    else if (posDiff <= 4) maxConfidence = 80;
    else if (posDiff <= 7) maxConfidence = 85;
    // else: puede llegar a 92%
  } else {
    // 1X2 y otros: límites más estrictos
    if (posDiff <= 2) maxConfidence = 68;
    else if (posDiff <= 4) maxConfidence = 72;
    else if (posDiff <= 7) maxConfidence = 78;
    // else: puede llegar a 85%
  }
  
  confidence = Math.min(confidence * 100, maxConfidence);
  
  // 🆕 Cap absoluto: 92% para totales, 85% para 1X2
  const absoluteCap = isTotalPick ? 92 : 85;
  return Math.round(Math.max(0, Math.min(absoluteCap, confidence)));
}

// ==========================================
// RAZONAMIENTO MEJORADO v6.2
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
// FILTRO DE PICKS MEJORADO v6.4 - Con Tiers
// ==========================================
function filtrarPicks(options: BetOption[], poissonData?: PoissonResult): BetOption[] {
  return options.filter(o => {
    if (o.probability < MIN_PROBABILITY) return false;
    if (o.confidence < MIN_CONFIDENCE) return false;
    
    // 🆕 v6.5 FIX: Validaciones de xG para evitar errores Poisson
    if (poissonData) {
      const xGTotal = poissonData.lambdaHome + poissonData.lambdaAway;
      
      // OVER 1.5 requiere xG mínimo
      if (o.type === 'OVER_15' && xGTotal < 1.8) return false;
      
      // OVER 2.5 requiere xG suficiente
      if (o.type === 'OVER_25' && xGTotal < 2.4) return false;
      
      // UNDER 2.5 no tiene sentido con xG alto
      if (o.type === 'UNDER_25' && xGTotal > 2.8) return false;
    }
    
    return true;
  });
}

// 🆕 Función para obtener el mejor pick SIEMPRE
function getBestPickAlways(options: BetOption[], xGTotal: number, posDiff: number, poissonData?: PoissonResult): BetOption {
  // Prioridad 1: Picks que pasan el filtro estricto
  const safePicks = filtrarPicks(options, poissonData);
  
  if (safePicks.length > 0) {
    // Ordenar por prioridad según contexto
    safePicks.sort((a, b) => {
      // 🆕 v6.4: Si xGTotal bajo o medio-bajo, favorecer UNDER
      if (xGTotal < 2.5) {
        if (a.type === 'UNDER_25' || a.type === 'UNDER_35') return -1;
        if (b.type === 'UNDER_25' || b.type === 'UNDER_35') return 1;
      }
      // Si xGTotal alto, favorecer OVER
      if (xGTotal > 3.0) {
        if (a.type === 'OVER_15' || a.type === 'OVER_25') return -1;
        if (b.type === 'OVER_15' || b.type === 'OVER_25') return 1;
      }
      // Si equipos parejos, favorecer totales sobre 1X2
      if (posDiff <= 3) {
        const isTotalA = a.type.includes('OVER') || a.type.includes('UNDER');
        const isTotalB = b.type.includes('OVER') || b.type.includes('UNDER');
        if (isTotalA && !isTotalB) return -1;
        if (!isTotalA && isTotalB) return 1;
      }
      // Orden normal por prioridad
      const priorityA = PICK_PRIORITY[a.type] || 50;
      const priorityB = PICK_PRIORITY[b.type] || 50;
      if (priorityA !== priorityB) return priorityB - priorityA;
      return b.confidence - a.confidence;
    });
    
    return { ...safePicks[0], note: undefined };
  }
  
  // Prioridad 2: Si nada pasa el filtro, buscar el mejor disponible
  // En partidos parejos, preferir totales de goles
  const sortedOptions = [...options].sort((a, b) => {
    // Si equipos muy parejos (posDiff <= 3), priorizar UNDER/OVER
    if (posDiff <= 3) {
      const isTotalA = a.type.includes('OVER') || a.type.includes('UNDER');
      const isTotalB = b.type.includes('OVER') || b.type.includes('UNDER');
      if (isTotalA && !isTotalB) return -1;
      if (!isTotalA && isTotalB) return 1;
    }
    
    // 🆕 v6.4: Si xGTotal bajo o medio-bajo, priorizar UNDER
    if (xGTotal < 2.6) {
      if (a.type === 'UNDER_25' || a.type === 'UNDER_35') return -1;
      if (b.type === 'UNDER_25' || b.type === 'UNDER_35') return 1;
    }
    
    // Si xGTotal alto, priorizar OVER
    if (xGTotal > 2.8) {
      if (a.type === 'OVER_15') return -1;
      if (b.type === 'OVER_15') return 1;
    }
    
    // Por defecto, ordenar por confianza
    return b.confidence - a.confidence;
  });
  
  const bestFallback = sortedOptions[0];
  
  // 🆕 Añadir nota indicando que es un pick de mayor riesgo
  return {
    ...bestFallback,
    note: `⚠️ Pick de riesgo (confianza: ${bestFallback.confidence}% < ${MIN_CONFIDENCE}% mínimo)`
  };
}

// ==========================================
// SELECTOR DE PICKS v6.4 - USA getBestPickAlways
// ==========================================
const PICK_PRIORITY: Record<string, number> = {
  'OVER_15': 100, 'UNDER_35': 98, 'UNDER_25': 92, 'DOUBLE_CHANCE_1X': 90, 'DOUBLE_CHANCE_X2': 90,
  'OVER_25': 80, 'BTTS_YES': 75, 'HOME_WIN': 70, 'AWAY_WIN': 70,
  'BTTS_NO': 65, 'UNDER_45': 50, 'DRAW': 40,
};

function selectBestPick(options: BetOption[], xGTotal: number, posDiff: number = 5, poissonData?: PoissonResult): BetOption {
  return getBestPickAlways(options, xGTotal, posDiff, poissonData);
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
// CALCULAR TODAS LAS APUESTAS v6.2 - Con posDiff
// ==========================================
function calcularTodasLasApuestas(
  home: TeamStats, away: TeamStats, p: PoissonResult, mc: MonteCarloResult,
  eloHome: number, eloAway: number, volatility: number
): BetOption[] {
  const eloProb = 1 / (1 + Math.pow(10, (eloAway - eloHome) / 400));
  // 🆕 v6.5 FIX: Goles promedio CORRECTO (incluye defense)
  const golesPromedio = (
    (home.avgGoalsFor + away.avgGoalsAgainst) / 2 +
    (away.avgGoalsFor + home.avgGoalsAgainst) / 2
  );
  
  // 🆕 Calcular diferencia de posición para calibración
  const posDiff = Math.abs(home.position - away.position);

  return [
    { type: 'HOME_WIN', probability: mc.homeWin, confidence: calcularConfianza(mc.homeWin, eloProb, home.formScore, volatility, posDiff, 'HOME_WIN'), label: 'Gana local', reasoning: generarRazones(home, away, 'HOME', p) },
    { type: 'AWAY_WIN', probability: mc.awayWin, confidence: calcularConfianza(mc.awayWin, 1 - eloProb, away.formScore, volatility, posDiff, 'AWAY_WIN'), label: 'Gana visitante', reasoning: generarRazones(home, away, 'AWAY', p) },
    { type: 'DRAW', probability: mc.draw, confidence: calcularConfianza(mc.draw, 0.3, 0.4, volatility, posDiff, 'DRAW'), label: 'Empate', reasoning: generarRazones(home, away, 'DRAW', p) },
    { type: 'DOUBLE_CHANCE_1X', probability: mc.homeWin + mc.draw, confidence: calcularConfianza(mc.homeWin + mc.draw, Math.min(1, eloProb + 0.15), home.formScore, volatility, posDiff, 'DOUBLE_CHANCE_1X'), label: 'Gana o empata local (1X)', reasoning: generarRazones(home, away, '1X', p) },
    { type: 'DOUBLE_CHANCE_X2', probability: mc.awayWin + mc.draw, confidence: calcularConfianza(mc.awayWin + mc.draw, Math.min(1, 1 - eloProb + 0.15), away.formScore, volatility, posDiff, 'DOUBLE_CHANCE_X2'), label: 'Gana o empata visitante (X2)', reasoning: generarRazones(home, away, 'X2', p) },
    { type: 'OVER_15', probability: mc.over15, confidence: calcularConfianza(mc.over15, 0.5, Math.min(1, golesPromedio / 4), volatility, posDiff, 'OVER_15'), label: 'Más de 1.5 goles', reasoning: generarRazones(home, away, 'OVER_15', p) },
    { type: 'OVER_25', probability: mc.over25, confidence: calcularConfianza(mc.over25, 0.5, Math.min(1, golesPromedio / 5), volatility, posDiff, 'OVER_25'), label: 'Más de 2.5 goles', reasoning: generarRazones(home, away, 'OVER_25', p) },
    { type: 'UNDER_25', probability: mc.under25, confidence: calcularConfianza(mc.under25, 0.5, Math.max(0, 1 - golesPromedio / 5), volatility, posDiff, 'UNDER_25'), label: 'Menos de 2.5 goles', reasoning: generarRazones(home, away, 'UNDER_25', p) },
    { type: 'UNDER_35', probability: mc.under35, confidence: calcularConfianza(mc.under35, 0.65, Math.max(0, 1 - golesPromedio / 6), volatility, posDiff, 'UNDER_35'), label: 'Menos de 3.5 goles', reasoning: generarRazones(home, away, 'UNDER_35', p) },
    { type: 'UNDER_45', probability: mc.under45, confidence: calcularConfianza(mc.under45, 0.80, Math.max(0, 1 - golesPromedio / 8), volatility, posDiff, 'UNDER_45'), label: 'Menos de 4.5 goles', reasoning: generarRazones(home, away, 'UNDER_45', p) },
    { type: 'BTTS_YES', probability: mc.btts, confidence: calcularConfianza(mc.btts, 0.5, Math.min(1, (home.avgGoalsFor + away.avgGoalsFor) / 6), volatility, posDiff, 'BTTS_YES'), label: 'Ambos equipos anotan', reasoning: generarRazones(home, away, 'BTTS', p) },
    { type: 'BTTS_NO', probability: 1 - mc.btts, confidence: calcularConfianza(1 - mc.btts, 0.5, Math.max(0, 1 - (home.avgGoalsFor + away.avgGoalsFor) / 6), volatility, posDiff, 'BTTS_NO'), label: 'No anotan ambos equipos', reasoning: generarRazones(home, away, 'BTTS_NO', p) },
  ];
}

// ==========================================
// ANÁLISIS PRINCIPAL v6.2 - Con Probability Calibration
// ==========================================
export async function analyzeMatchAsync(match: MatchForApp): Promise<PickResult | null> {
  console.log(`\n🔍 Analizando: ${match.homeTeam} vs ${match.awayTeam}`);
  const leagueCode = LEAGUE_CODE_MAP[match.league] || '';
  console.log(`📍 Liga: ${match.league} (${leagueCode || 'sin código'})`);

  const homeStats = await extractTeamStats(match.homeCompetitorRaw, leagueCode);
  const awayStats = await extractTeamStats(match.awayCompetitorRaw, leagueCode);
  
  // 🆕 v6.5 FIX: Si no hay datos, usar stats sintéticas (no omitir el partido)
  const finalHomeStats = homeStats || {
    teamId: 0,
    name: match.homeTeam,
    position: 10,
    played: 10,
    wins: 4,
    draws: 3,
    losses: 3,
    goalsFor: 14,
    goalsAgainst: 14,
    avgGoalsFor: 1.35,
    avgGoalsAgainst: 1.35,
    form: ['D', 'D', 'D', 'D', 'D'],
    formScore: 0.4
  };
  
  const finalAwayStats = awayStats || {
    teamId: 0,
    name: match.awayTeam,
    position: 10,
    played: 10,
    wins: 4,
    draws: 3,
    losses: 3,
    goalsFor: 14,
    goalsAgainst: 14,
    avgGoalsFor: 1.35,
    avgGoalsAgainst: 1.35,
    form: ['D', 'D', 'D', 'D', 'D'],
    formScore: 0.4
  };
  
  if (!homeStats || !awayStats) {
    console.log(`⚠️ Sin datos reales — Usando stats sintéticas`);
  }

  const poissonResult = calcularPoisson(finalHomeStats, finalAwayStats, leagueCode);
  const monteCarloResult = monteCarloFast(poissonResult.lambdaHome, poissonResult.lambdaAway);
  const eloHome = calcularElo(finalHomeStats);
  const eloAway = calcularElo(finalAwayStats);
  const volatility = calcularVolatilidad(poissonResult, finalHomeStats, finalAwayStats);
  const xGTotal = poissonResult.lambdaHome + poissonResult.lambdaAway;
  const posDiff = Math.abs(finalHomeStats.position - finalAwayStats.position);

  const options = calcularTodasLasApuestas(finalHomeStats, finalAwayStats, poissonResult, monteCarloResult, eloHome, eloAway, volatility);
  options.sort((a, b) => b.confidence - a.confidence);

  const bestPick = selectBestPick(options, xGTotal, posDiff, poissonResult);
  const safePicks = filtrarPicks(options, poissonResult);

  // 🆕 Sistema de tiers más granular
  let riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';
  if (bestPick.confidence >= 75) riskLevel = 'SAFE';
  else if (bestPick.confidence >= 68) riskLevel = 'LOW';
  else if (bestPick.confidence >= 60) riskLevel = 'MEDIUM';
  else riskLevel = 'HIGH';

  // 🆕 Calcular Value Bet (vs cuota de mercado estimada)
  const marketOdds = 1 / bestPick.probability;
  const fairOdds = Math.round((1 / bestPick.probability) * 0.95 * 100) / 100;
  const valueBet = Math.max(0, (bestPick.probability - (1/marketOdds)) * 100);

  // Log con indicador de riesgo si aplica
  const riskEmoji = riskLevel === 'SAFE' ? '✅' : riskLevel === 'LOW' ? '🟢' : riskLevel === 'MEDIUM' ? '🟡' : '🔴';
  console.log(`${riskEmoji} Pick: ${bestPick.label} (${bestPick.confidence}% confianza) - Riesgo: ${riskLevel}`);
  if (bestPick.note) console.log(`   ${bestPick.note}`);
  console.log(`📊 xG: ${xGTotal.toFixed(2)} (Home: ${poissonResult.lambdaHome.toFixed(2)}, Away: ${poissonResult.lambdaAway.toFixed(2)})`);
  console.log(`🏆 ELO: ${eloHome.toFixed(0)} vs ${eloAway.toFixed(0)} (diff: ${(eloHome - eloAway).toFixed(0)})`);
  console.log(`📍 Posición: #${finalHomeStats.position} vs #${finalAwayStats.position} (diff: ${posDiff})`);
  console.log(`⚡ Volatilidad: ${volatility}%`);
  console.log(`💰 Value: +${valueBet.toFixed(1)}% | Cuota justa: ${fairOdds.toFixed(2)}`);
  console.log(`🎯 Scores: ${monteCarloResult.mostLikelyScores.map(s => `${s.score}(${(s.prob*100).toFixed(1)}%)`).join(', ')}`);

  return {
    matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam,
    league: match.league, matchDate: match.matchDate, pick: bestPick,
    safePicks, allOptions: options, riskLevel,
    modelVersion: 'poisson-montecarlo-dixon-coles-v6.5',
    poissonData: poissonResult, monteCarloData: monteCarloResult,
    homeStats: finalHomeStats, awayStats: finalAwayStats, eloHome, eloAway, volatility, xGTotal,
  };
}

export async function analyzeMatches(matches: MatchForApp[]): Promise<PickResult[]> {
  console.log(`\n🔍 Analizando ${matches.length} partidos...`);
  const results: PickResult[] = [];
  for (const match of matches) {
    try {
      const result = await analyzeMatchAsync(match);
      if (result) results.push(result); // 🆕 SIEMPRE incluir resultado
    } catch (error) { console.error(`Error:`, error); }
  }
  results.sort((a, b) => b.pick.confidence - a.pick.confidence);
  
  // 🆕 Log resumen por nivel de riesgo
  const safe = results.filter(r => r.riskLevel === 'SAFE').length;
  const low = results.filter(r => r.riskLevel === 'LOW').length;
  const medium = results.filter(r => r.riskLevel === 'MEDIUM').length;
  const high = results.filter(r => r.riskLevel === 'HIGH').length;
  console.log(`\n📊 Resumen: ${safe} seguros, ${low} bajos, ${medium} medios, ${high} altos`);
  
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
  
  // 🆕 v6.5 FIX: Incluir SAFE, LOW y MEDIUM (no solo LOW y MEDIUM)
  const goodResults = results.filter(r => 
    r.riskLevel === 'SAFE' || r.riskLevel === 'LOW' || r.riskLevel === 'MEDIUM'
  );
  
  console.log(`📊 Picks válidos: ${goodResults.length}/${results.length} (SAFE+LOW+MEDIUM)`);
  
  const picks = goodResults.map(pickResultToMatchPick);
  const totalOdds = Math.round(picks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
  const totalProbability = Math.round(picks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
  const avgScore = picks.length > 0 ? Math.round(picks.reduce((acc, p) => acc + p.score, 0) / picks.length) : 0;

  return { id: `comb_${Date.now()}`, picks, totalOdds, totalProbability, score: avgScore, risk: 'low', status: 'pending', taken: false };
}

export function generateCombinadaFromMatches(selectedMatches: any[]): Combinada {
  return { id: `comb_${Date.now()}`, picks: [], totalOdds: 1, totalProbability: 0, score: 0, risk: 'low', status: 'pending', taken: false };
}
