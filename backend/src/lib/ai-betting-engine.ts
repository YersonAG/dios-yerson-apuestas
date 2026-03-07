// Motor de Análisis v4.7 PRO - El Dios Yerson
// CON: Monte Carlo, ELO Rating, xG, Value Betting, Volatilidad
// USA: Datos REALES de football-data.org API

import { getTeamStats } from './football-api';

// ==========================================
// BASE DE DATOS DE EQUIPOS (Fallback si no hay datos de API)
// ==========================================
interface TeamData {
  name: string;
  elo: number;
  strength: number;
  form: string;
  xG: number;
  xGA: number;
  goalsAvg: number;
  goalsConceded: number;
  homeWinRate: number;
  awayWinRate: number;
  consistency: number;
}

// ELO inicial por liga (se ajusta con datos reales)
const BASE_ELO: Record<string, number> = {
  'Premier League': 1700,
  'Primera Division': 1700,
  'Serie A': 1680,
  'Bundesliga': 1690,
  'Ligue 1': 1670,
  'Eredivisie': 1600,
  'Primeira Liga': 1620,
  'Campeonato Brasileiro Série A': 1580,
  'UEFA Champions League': 1750,
  'Copa Libertadores': 1550,
};

// Datos base de equipos (se sobrescriben con datos reales)
const TEAMS_DATABASE: Record<string, TeamData> = {
  // PREMIER LEAGUE
  'Manchester City': { name: 'Manchester City', elo: 1890, strength: 95, form: 'WWDWW', xG: 2.5, xGA: 0.85, goalsAvg: 2.7, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.75, consistency: 90 },
  'Arsenal FC': { name: 'Arsenal FC', elo: 1840, strength: 90, form: 'WDWWW', xG: 2.2, xGA: 0.95, goalsAvg: 2.4, goalsConceded: 1.0, homeWinRate: 0.82, awayWinRate: 0.70, consistency: 85 },
  'Arsenal': { name: 'Arsenal', elo: 1840, strength: 90, form: 'WDWWW', xG: 2.2, xGA: 0.95, goalsAvg: 2.4, goalsConceded: 1.0, homeWinRate: 0.82, awayWinRate: 0.70, consistency: 85 },
  'Liverpool FC': { name: 'Liverpool FC', elo: 1855, strength: 92, form: 'WWDWW', xG: 2.3, xGA: 1.0, goalsAvg: 2.5, goalsConceded: 1.1, homeWinRate: 0.80, awayWinRate: 0.72, consistency: 88 },
  'Liverpool': { name: 'Liverpool', elo: 1855, strength: 92, form: 'WWDWW', xG: 2.3, xGA: 1.0, goalsAvg: 2.5, goalsConceded: 1.1, homeWinRate: 0.80, awayWinRate: 0.72, consistency: 88 },
  'Manchester United FC': { name: 'Manchester United FC', elo: 1740, strength: 82, form: 'WLWDL', xG: 1.7, xGA: 1.25, goalsAvg: 1.8, goalsConceded: 1.3, homeWinRate: 0.65, awayWinRate: 0.50, consistency: 60 },
  'Manchester United': { name: 'Manchester United', elo: 1740, strength: 82, form: 'WLWDL', xG: 1.7, xGA: 1.25, goalsAvg: 1.8, goalsConceded: 1.3, homeWinRate: 0.65, awayWinRate: 0.50, consistency: 60 },
  'Chelsea FC': { name: 'Chelsea FC', elo: 1720, strength: 80, form: 'WDWDL', xG: 1.6, xGA: 1.2, goalsAvg: 1.7, goalsConceded: 1.2, homeWinRate: 0.62, awayWinRate: 0.48, consistency: 58 },
  'Chelsea': { name: 'Chelsea', elo: 1720, strength: 80, form: 'WDWDL', xG: 1.6, xGA: 1.2, goalsAvg: 1.7, goalsConceded: 1.2, homeWinRate: 0.62, awayWinRate: 0.48, consistency: 58 },
  'Tottenham Hotspur FC': { name: 'Tottenham Hotspur FC', elo: 1700, strength: 78, form: 'LWWDL', xG: 1.8, xGA: 1.35, goalsAvg: 1.9, goalsConceded: 1.4, homeWinRate: 0.60, awayWinRate: 0.45, consistency: 55 },
  'Tottenham Hotspur': { name: 'Tottenham Hotspur', elo: 1700, strength: 78, form: 'LWWDL', xG: 1.8, xGA: 1.35, goalsAvg: 1.9, goalsConceded: 1.4, homeWinRate: 0.60, awayWinRate: 0.45, consistency: 55 },
  
  // LA LIGA
  'Real Madrid CF': { name: 'Real Madrid CF', elo: 1880, strength: 94, form: 'WWWWW', xG: 2.4, xGA: 0.8, goalsAvg: 2.5, goalsConceded: 0.8, homeWinRate: 0.88, awayWinRate: 0.72, consistency: 92 },
  'Real Madrid': { name: 'Real Madrid', elo: 1880, strength: 94, form: 'WWWWW', xG: 2.4, xGA: 0.8, goalsAvg: 2.5, goalsConceded: 0.8, homeWinRate: 0.88, awayWinRate: 0.72, consistency: 92 },
  'FC Barcelona': { name: 'FC Barcelona', elo: 1850, strength: 91, form: 'WDWWW', xG: 2.2, xGA: 0.9, goalsAvg: 2.3, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.68, consistency: 85 },
  'Barcelona': { name: 'Barcelona', elo: 1850, strength: 91, form: 'WDWWW', xG: 2.2, xGA: 0.9, goalsAvg: 2.3, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.68, consistency: 85 },
  'Atlético de Madrid': { name: 'Atlético de Madrid', elo: 1790, strength: 85, form: 'WDWDW', xG: 1.7, xGA: 0.7, goalsAvg: 1.8, goalsConceded: 0.7, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 80 },
  'Atlético Madrid': { name: 'Atlético Madrid', elo: 1790, strength: 85, form: 'WDWDW', xG: 1.7, xGA: 0.7, goalsAvg: 1.8, goalsConceded: 0.7, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 80 },
  
  // SERIE A
  'FC Internazionale Milano': { name: 'FC Internazionale Milano', elo: 1830, strength: 90, form: 'WDWWW', xG: 2.2, xGA: 0.8, goalsAvg: 2.3, goalsConceded: 0.8, homeWinRate: 0.82, awayWinRate: 0.65, consistency: 85 },
  'Inter Milan': { name: 'Inter Milan', elo: 1830, strength: 90, form: 'WDWWW', xG: 2.2, xGA: 0.8, goalsAvg: 2.3, goalsConceded: 0.8, homeWinRate: 0.82, awayWinRate: 0.65, consistency: 85 },
  'Inter': { name: 'Inter', elo: 1830, strength: 90, form: 'WDWWW', xG: 2.2, xGA: 0.8, goalsAvg: 2.3, goalsConceded: 0.8, homeWinRate: 0.82, awayWinRate: 0.65, consistency: 85 },
  'SSC Napoli': { name: 'SSC Napoli', elo: 1790, strength: 85, form: 'WDWDW', xG: 2.0, xGA: 0.9, goalsAvg: 2.1, goalsConceded: 0.9, homeWinRate: 0.78, awayWinRate: 0.58, consistency: 80 },
  'Napoli': { name: 'Napoli', elo: 1790, strength: 85, form: 'WDWDW', xG: 2.0, xGA: 0.9, goalsAvg: 2.1, goalsConceded: 0.9, homeWinRate: 0.78, awayWinRate: 0.58, consistency: 80 },
  'AC Milan': { name: 'AC Milan', elo: 1770, strength: 83, form: 'WLWDW', xG: 1.8, xGA: 1.0, goalsAvg: 1.9, goalsConceded: 1.0, homeWinRate: 0.72, awayWinRate: 0.52, consistency: 72 },
  'Juventus FC': { name: 'Juventus FC', elo: 1760, strength: 82, form: 'WDWDW', xG: 1.6, xGA: 0.7, goalsAvg: 1.7, goalsConceded: 0.7, homeWinRate: 0.70, awayWinRate: 0.55, consistency: 78 },
  'Juventus': { name: 'Juventus', elo: 1760, strength: 82, form: 'WDWDW', xG: 1.6, xGA: 0.7, goalsAvg: 1.7, goalsConceded: 0.7, homeWinRate: 0.70, awayWinRate: 0.55, consistency: 78 },
  'Atalanta BC': { name: 'Atalanta BC', elo: 1730, strength: 78, form: 'WWLWD', xG: 1.9, xGA: 1.2, goalsAvg: 2.0, goalsConceded: 1.2, homeWinRate: 0.68, awayWinRate: 0.48, consistency: 70 },
  'Atalanta': { name: 'Atalanta', elo: 1730, strength: 78, form: 'WWLWD', xG: 1.9, xGA: 1.2, goalsAvg: 2.0, goalsConceded: 1.2, homeWinRate: 0.68, awayWinRate: 0.48, consistency: 70 },
  
  // BUNDESLIGA
  'FC Bayern München': { name: 'FC Bayern München', elo: 1895, strength: 95, form: 'WWWWW', xG: 2.8, xGA: 0.8, goalsAvg: 3.0, goalsConceded: 0.8, homeWinRate: 0.90, awayWinRate: 0.75, consistency: 92 },
  'Bayern Munich': { name: 'Bayern Munich', elo: 1895, strength: 95, form: 'WWWWW', xG: 2.8, xGA: 0.8, goalsAvg: 3.0, goalsConceded: 0.8, homeWinRate: 0.90, awayWinRate: 0.75, consistency: 92 },
  'Bayern': { name: 'Bayern', elo: 1895, strength: 95, form: 'WWWWW', xG: 2.8, xGA: 0.8, goalsAvg: 3.0, goalsConceded: 0.8, homeWinRate: 0.90, awayWinRate: 0.75, consistency: 92 },
  'Borussia Dortmund': { name: 'Borussia Dortmund', elo: 1810, strength: 88, form: 'WDWWW', xG: 2.3, xGA: 1.2, goalsAvg: 2.4, goalsConceded: 1.2, homeWinRate: 0.78, awayWinRate: 0.58, consistency: 75 },
  'Bayer 04 Leverkusen': { name: 'Bayer 04 Leverkusen', elo: 1800, strength: 85, form: 'WDWDW', xG: 2.1, xGA: 1.0, goalsAvg: 2.2, goalsConceded: 1.0, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 80 },
  'Bayer Leverkusen': { name: 'Bayer Leverkusen', elo: 1800, strength: 85, form: 'WDWDW', xG: 2.1, xGA: 1.0, goalsAvg: 2.2, goalsConceded: 1.0, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 80 },
  
  // LIGUE 1
  'Paris Saint-Germain FC': { name: 'Paris Saint-Germain FC', elo: 1900, strength: 96, form: 'WWWWW', xG: 2.7, xGA: 0.7, goalsAvg: 2.8, goalsConceded: 0.7, homeWinRate: 0.92, awayWinRate: 0.78, consistency: 90 },
  'Paris Saint-Germain': { name: 'Paris Saint-Germain', elo: 1900, strength: 96, form: 'WWWWW', xG: 2.7, xGA: 0.7, goalsAvg: 2.8, goalsConceded: 0.7, homeWinRate: 0.92, awayWinRate: 0.78, consistency: 90 },
  'PSG': { name: 'PSG', elo: 1900, strength: 96, form: 'WWWWW', xG: 2.7, xGA: 0.7, goalsAvg: 2.8, goalsConceded: 0.7, homeWinRate: 0.92, awayWinRate: 0.78, consistency: 90 },
  'AS Monaco FC': { name: 'AS Monaco FC', elo: 1740, strength: 80, form: 'WDWDL', xG: 1.8, xGA: 1.2, goalsAvg: 1.9, goalsConceded: 1.2, homeWinRate: 0.65, awayWinRate: 0.48, consistency: 65 },
  'Monaco': { name: 'Monaco', elo: 1740, strength: 80, form: 'WDWDL', xG: 1.8, xGA: 1.2, goalsAvg: 1.9, goalsConceded: 1.2, homeWinRate: 0.65, awayWinRate: 0.48, consistency: 65 },
  
  // EREDIVISIE
  'PSV Eindhoven': { name: 'PSV Eindhoven', elo: 1780, strength: 82, form: 'WWWDW', xG: 2.39, xGA: 0.95, goalsAvg: 2.8, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.70, consistency: 85 },
  'PSV': { name: 'PSV', elo: 1780, strength: 82, form: 'WWWDW', xG: 2.39, xGA: 0.95, goalsAvg: 2.8, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.70, consistency: 85 },
  'AZ Alkmaar': { name: 'AZ Alkmaar', elo: 1594, strength: 68, form: 'WDLWD', xG: 1.27, xGA: 1.35, goalsAvg: 1.5, goalsConceded: 1.4, homeWinRate: 0.55, awayWinRate: 0.42, consistency: 62 },
  'AZ': { name: 'AZ', elo: 1594, strength: 68, form: 'WDLWD', xG: 1.27, xGA: 1.35, goalsAvg: 1.5, goalsConceded: 1.4, homeWinRate: 0.55, awayWinRate: 0.42, consistency: 62 },
  'AFC Ajax Amsterdam': { name: 'AFC Ajax Amsterdam', elo: 1720, strength: 78, form: 'WDWDW', xG: 2.1, xGA: 1.05, goalsAvg: 2.2, goalsConceded: 1.0, homeWinRate: 0.78, awayWinRate: 0.62, consistency: 75 },
  'Ajax': { name: 'Ajax', elo: 1720, strength: 78, form: 'WDWDW', xG: 2.1, xGA: 1.05, goalsAvg: 2.2, goalsConceded: 1.0, homeWinRate: 0.78, awayWinRate: 0.62, consistency: 75 },
  'Feyenoord Rotterdam': { name: 'Feyenoord Rotterdam', elo: 1690, strength: 75, form: 'WLWDW', xG: 1.85, xGA: 1.15, goalsAvg: 1.9, goalsConceded: 1.1, homeWinRate: 0.72, awayWinRate: 0.55, consistency: 70 },
  'Feyenoord': { name: 'Feyenoord', elo: 1690, strength: 75, form: 'WLWDW', xG: 1.85, xGA: 1.15, goalsAvg: 1.9, goalsConceded: 1.1, homeWinRate: 0.72, awayWinRate: 0.55, consistency: 70 },
};

// ==========================================
// INTERFACES
// ==========================================
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
// FUNCIONES DE BÚSQUEDA
// ==========================================
function findTeamInDatabase(teamName: string): TeamData | null {
  const normalized = teamName.toLowerCase().trim();
  
  for (const [key, team] of Object.entries(TEAMS_DATABASE)) {
    if (key.toLowerCase() === normalized || team.name.toLowerCase() === normalized) {
      return team;
    }
    // Búsqueda flexible
    if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return team;
    }
  }
  
  return null;
}

// ==========================================
// MONTE CARLO SIMULATION (10K iteraciones)
// ==========================================
function monteCarloSimulation(
  homeXG: number, 
  awayXG: number, 
  homeStrength: number, 
  awayStrength: number,
  iterations: number = 10000
): { homeWinProb: number; drawProb: number; awayWinProb: number; over15Prob: number; over25Prob: number } {
  
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let over15 = 0;
  let over25 = 0;
  
  const strengthFactor = (homeStrength - awayStrength) / 100;
  const adjustedHomeXG = homeXG * (1 + strengthFactor * 0.15);
  const adjustedAwayXG = awayXG * (1 - strengthFactor * 0.10);
  
  for (let i = 0; i < iterations; i++) {
    const homeGoals = poissonRandom(adjustedHomeXG);
    const awayGoals = poissonRandom(adjustedAwayXG);
    
    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals < awayGoals) awayWins++;
    else draws++;
    
    if (homeGoals + awayGoals > 1.5) over15++;
    if (homeGoals + awayGoals > 2.5) over25++;
  }
  
  return {
    homeWinProb: homeWins / iterations,
    drawProb: draws / iterations,
    awayWinProb: awayWins / iterations,
    over15Prob: over15 / iterations,
    over25Prob: over25 / iterations,
  };
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  
  return k - 1;
}

// ==========================================
// CALCULAR SCORE TOTAL (0-100)
// ==========================================
function calculateMatchScore(
  eloDiff: number,
  xGGap: number,
  offensivePower: number,
  defensiveSolid: number,
  form: number,
  homeAdvantage: number,
  consistency: number,
  volatility: number,
  monteCarloProb: number
): number {
  const weights = {
    monteCarlo: 0.30,
    elo: 0.20,
    xGGap: 0.10,
    offensive: 0.08,
    defensive: 0.08,
    form: 0.10,
    homeAdvantage: 0.05,
    consistency: 0.05,
    volatility: 0.04,
  };
  
  const eloScore = Math.min(100, Math.max(0, 50 + eloDiff / 8));
  const xGScore = Math.min(100, Math.max(0, 50 + xGGap * 20));
  const volatilityScore = 100 - volatility;
  
  const score = 
    monteCarloProb * 100 * weights.monteCarlo +
    eloScore * weights.elo +
    xGScore * weights.xGGap +
    offensivePower * weights.offensive +
    defensiveSolid * weights.defensive +
    form * weights.form +
    homeAdvantage * weights.homeAdvantage +
    consistency * weights.consistency +
    volatilityScore * weights.volatility;
  
  return Math.round(score * 10) / 10;
}

// ==========================================
// ANÁLISIS PRINCIPAL DE PARTIDO
// ==========================================
export function analyzeMatch(
  homeTeamName: string, 
  awayTeamName: string, 
  leagueName?: string,
  homeTeamId?: number,
  awayTeamId?: number
): MatchAnalysis {
  // Buscar datos en la base de datos
  let homeTeam = findTeamInDatabase(homeTeamName);
  let awayTeam = findTeamInDatabase(awayTeamName);
  
  // Valores por defecto
  const defaultTeam: TeamData = {
    name: "Unknown",
    elo: 1500,
    strength: 65,
    form: "WDLWD",
    xG: 1.2,
    xGA: 1.3,
    goalsAvg: 1.2,
    goalsConceded: 1.3,
    homeWinRate: 0.50,
    awayWinRate: 0.35,
    consistency: 55,
  };
  
  homeTeam = homeTeam || { ...defaultTeam, name: homeTeamName };
  awayTeam = awayTeam || { ...defaultTeam, name: awayTeamName };
  
  // ===== INTENTAR OBTENER DATOS REALES DE LA API =====
  const homeStats = getTeamStats(homeTeamId);
  const awayStats = getTeamStats(awayTeamId);
  
  if (homeStats) {
    console.log(`📊 Datos REALES para ${homeTeamName}: xG ${homeStats.goalsFor}, Forma ${homeStats.form}`);
    homeTeam = {
      ...homeTeam,
      xG: homeStats.goalsFor,
      xGA: homeStats.goalsAgainst,
      form: homeStats.form,
      goalsAvg: homeStats.goalsFor,
      goalsConceded: homeStats.goalsAgainst,
      strength: Math.max(40, 85 - homeStats.position * 2),
    };
  }
  
  if (awayStats) {
    console.log(`📊 Datos REALES para ${awayTeamName}: xG ${awayStats.goalsFor}, Forma ${awayStats.form}`);
    awayTeam = {
      ...awayTeam,
      xG: awayStats.goalsFor,
      xGA: awayStats.goalsAgainst,
      form: awayStats.form,
      goalsAvg: awayStats.goalsFor,
      goalsConceded: awayStats.goalsAgainst,
      strength: Math.max(40, 85 - awayStats.position * 2),
    };
  }
  
  const league = leagueName || "Liga Desconocida";
  
  // ===== CALCULAR MÉTRICAS =====
  const eloDiff = homeTeam.elo - awayTeam.elo;
  const xGTotal = homeTeam.xG + awayTeam.xG;
  const xGGap = homeTeam.xG - awayTeam.xGA;
  
  // Forma reciente
  const calcForm = (form: string) => {
    return form.split('').reduce((acc, c) => {
      if (c === 'W') return acc + 1;
      if (c === 'D') return acc + 0.5;
      return acc;
    }, 0) / 5 * 100;
  };
  
  const homeFormScore = calcForm(homeTeam.form);
  const awayFormScore = calcForm(awayTeam.form);
  
  // Monte Carlo
  const mc = monteCarloSimulation(homeTeam.xG, awayTeam.xG, homeTeam.strength, awayTeam.strength);
  
  // Métricas adicionales
  const offensivePower = Math.min(100, (homeTeam.xG / 2.5) * 80 + (homeTeam.goalsAvg / 3) * 20);
  const defensiveSolid = Math.min(100, 100 - (homeTeam.xGA / 2) * 50 - (homeTeam.goalsConceded / 2) * 50);
  const homeAdvantage = homeTeam.homeWinRate * 100;
  const volatility = Math.max(0, 100 - homeTeam.consistency + Math.abs(eloDiff) / 30);
  
  // Value Bet
  const impliedProb = 1 / 1.25;
  const valueBet = Math.round((mc.over15Prob - impliedProb) * 100);
  
  // Score total
  const score = calculateMatchScore(
    eloDiff, xGGap, offensivePower, defensiveSolid,
    homeFormScore, homeAdvantage, homeTeam.consistency,
    volatility, mc.over15Prob
  );
  
  // ===== GENERAR PICK =====
  let bestPick = {
    label: 'Más de 1.5 goles',
    probability: mc.over15Prob,
    odds: Math.round((1 / mc.over15Prob) * 100) / 100,
    reasoning: `xG Total: ${xGTotal.toFixed(2)} (${homeTeam.name} ${homeTeam.xG.toFixed(2)} - ${awayTeam.name} ${awayTeam.xG.toFixed(2)})`,
  };
  
  if (eloDiff > 150) {
    const prob = Math.min(0.92, mc.homeWinProb + mc.drawProb);
    bestPick = {
      label: `${homeTeam.name} gana o empata (1X)`,
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `ELO Diff: +${eloDiff} (${homeTeam.name} claro favorito). Monte Carlo: ${Math.round(prob * 100)}%`,
    };
  } else if (eloDiff < -150) {
    const prob = Math.min(0.92, mc.awayWinProb + mc.drawProb);
    bestPick = {
      label: `${awayTeam.name} gana o empata (X2)`,
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `ELO Diff: ${eloDiff} (${awayTeam.name} claro favorito). Monte Carlo: ${Math.round(prob * 100)}%`,
    };
  } else if (mc.over15Prob > 0.75) {
    bestPick = {
      label: 'Más de 1.5 goles',
      probability: mc.over15Prob,
      odds: Math.round((1 / mc.over15Prob) * 100) / 100,
      reasoning: `xG Total: ${xGTotal.toFixed(2)}. Monte Carlo: ${Math.round(mc.over15Prob * 100)}%`,
    };
  }
  
  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    league,
    score,
    eloDiff,
    xGTotal,
    monteCarloProb: mc.over15Prob,
    volatility,
    valueBet,
    bestPick,
  };
}

// ==========================================
// GENERAR PICK PARA UN PARTIDO
// ==========================================
export function generatePickForMatch(match: { 
  id: string; 
  homeTeam: string; 
  awayTeam: string; 
  league: string;
  matchDate: string;
  homeTeamId?: number;
  awayTeamId?: number;
}): MatchPick {
  const analysis = analyzeMatch(
    match.homeTeam, 
    match.awayTeam, 
    match.league,
    match.homeTeamId,
    match.awayTeamId
  );
  
  return {
    matchId: match.id,
    homeTeam: analysis.homeTeam,
    awayTeam: analysis.awayTeam,
    league: analysis.league,
    matchDate: match.matchDate,
    pick: analysis.bestPick.label,
    odds: analysis.bestPick.odds,
    probability: analysis.bestPick.probability,
    analysis: analysis.bestPick.reasoning,
    score: analysis.score,
    monteCarloProb: analysis.monteCarloProb,
    eloDiff: analysis.eloDiff,
    xGTotal: analysis.xGTotal,
    volatility: analysis.volatility,
    valueBet: analysis.valueBet,
    status: 'pending',
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  };
}

// ==========================================
// GENERAR COMBINADA DESDE PARTIDOS
// ==========================================
export function generateCombinadaFromMatches(
  selectedMatches: Array<{ 
    id: string; 
    homeTeam: string; 
    awayTeam: string; 
    league: string; 
    matchDate: string;
    homeTeamId?: number;
    awayTeamId?: number;
  }>
): Combinada {
  // Analizar todos los partidos
  const allPicks = selectedMatches.map(match => generatePickForMatch(match));
  
  // FILTRAR: Solo picks con Score > 65 (BAJO RIESGO)
  const goodPicks = allPicks.filter(p => p.score >= 65);
  
  // Ordenar por score descendente
  goodPicks.sort((a, b) => b.score - a.score);
  
  const matchPicks = goodPicks;
  
  const totalOdds = Math.round(matchPicks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
  const totalProbability = Math.round(matchPicks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
  const avgScore = matchPicks.length > 0 
    ? Math.round(matchPicks.reduce((acc, p) => acc + p.score, 0) / matchPicks.length)
    : 0;
  
  return {
    id: `comb_${Date.now()}`,
    picks: matchPicks,
    totalOdds,
    totalProbability,
    score: avgScore,
    risk: 'low',
    status: 'pending',
    taken: false,
  };
}

export { TEAMS_DATABASE };
