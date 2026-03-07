// Motor de Análisis v4.7 PRO - El Dios Yerson
// CON: Monte Carlo, ELO Rating, xG, Value Betting, Volatilidad
// REGLA: SOLO APUESTAS DE BAJO RIESGO (Score > 65)

// ==========================================
// BASE DE DATOS DE EQUIPOS CON ELO Y STATS
// ==========================================
interface TeamData {
  name: string;
  elo: number;           // ELO Rating (1200-2000)
  strength: number;      // Fuerza general (0-100)
  form: string;          // Últimos 5: W/D/L
  xG: number;            // Expected Goals promedio
  xGA: number;           // Expected Goals Against
  goalsAvg: number;      // Goles promedio por partido
  goalsConceded: number; // Goles recibidos promedio
  homeWinRate: number;   // Win rate local
  awayWinRate: number;   // Win rate visitante
  consistency: number;   // Consistencia (0-100)
}

const TEAMS_BY_LEAGUE: Record<string, TeamData[]> = {
  // ===== HOLANDA - EREDIVISIE =====
  "Eredivisie": [
    { name: "PSV", elo: 1780, strength: 82, form: "WWWDW", xG: 2.39, xGA: 0.95, goalsAvg: 2.8, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.70, consistency: 85 },
    { name: "AZ", elo: 1594, strength: 68, form: "WDLWD", xG: 1.27, xGA: 1.35, goalsAvg: 1.5, goalsConceded: 1.4, homeWinRate: 0.55, awayWinRate: 0.42, consistency: 62 },
    { name: "NEC", elo: 1560, strength: 65, form: "WDWDL", xG: 1.45, xGA: 1.40, goalsAvg: 1.4, goalsConceded: 1.5, homeWinRate: 0.52, awayWinRate: 0.38, consistency: 58 },
    { name: "FC Volendam", elo: 1480, strength: 55, form: "LDLWL", xG: 1.02, xGA: 1.95, goalsAvg: 1.0, goalsConceded: 2.0, homeWinRate: 0.35, awayWinRate: 0.22, consistency: 45 },
    { name: "Ajax", elo: 1720, strength: 78, form: "WDWDW", xG: 2.10, xGA: 1.05, goalsAvg: 2.2, goalsConceded: 1.0, homeWinRate: 0.78, awayWinRate: 0.62, consistency: 75 },
    { name: "Feyenoord", elo: 1690, strength: 75, form: "WLWDW", xG: 1.85, xGA: 1.15, goalsAvg: 1.9, goalsConceded: 1.1, homeWinRate: 0.72, awayWinRate: 0.55, consistency: 70 },
    { name: "Twente", elo: 1610, strength: 68, form: "WDWDL", xG: 1.55, xGA: 1.25, goalsAvg: 1.5, goalsConceded: 1.3, homeWinRate: 0.58, awayWinRate: 0.42, consistency: 65 },
    { name: "Utrecht", elo: 1580, strength: 65, form: "WDLWD", xG: 1.40, xGA: 1.35, goalsAvg: 1.4, goalsConceded: 1.4, homeWinRate: 0.52, awayWinRate: 0.40, consistency: 60 },
  ],
  
  // ===== INGLATERRA - PREMIER LEAGUE =====
  "Premier League": [
    { name: "Manchester City", elo: 1890, strength: 95, form: "WWWDW", xG: 2.50, xGA: 0.85, goalsAvg: 2.7, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.75, consistency: 90 },
    { name: "Arsenal", elo: 1840, strength: 90, form: "WDWWW", xG: 2.20, xGA: 0.95, goalsAvg: 2.4, goalsConceded: 1.0, homeWinRate: 0.82, awayWinRate: 0.70, consistency: 85 },
    { name: "Liverpool", elo: 1855, strength: 92, form: "WWDWW", xG: 2.30, xGA: 1.00, goalsAvg: 2.5, goalsConceded: 1.1, homeWinRate: 0.80, awayWinRate: 0.72, consistency: 88 },
    { name: "Manchester United", elo: 1740, strength: 82, form: "WLWDL", xG: 1.70, xGA: 1.25, goalsAvg: 1.8, goalsConceded: 1.3, homeWinRate: 0.65, awayWinRate: 0.50, consistency: 60 },
    { name: "Chelsea", elo: 1720, strength: 80, form: "WDWDL", xG: 1.60, xGA: 1.20, goalsAvg: 1.7, goalsConceded: 1.2, homeWinRate: 0.62, awayWinRate: 0.48, consistency: 58 },
    { name: "Tottenham", elo: 1700, strength: 78, form: "LWWDL", xG: 1.80, xGA: 1.35, goalsAvg: 1.9, goalsConceded: 1.4, homeWinRate: 0.60, awayWinRate: 0.45, consistency: 55 },
    { name: "Newcastle", elo: 1680, strength: 75, form: "WDWDW", xG: 1.50, xGA: 1.00, goalsAvg: 1.6, goalsConceded: 1.0, homeWinRate: 0.70, awayWinRate: 0.42, consistency: 72 },
    { name: "Aston Villa", elo: 1660, strength: 72, form: "WWLWD", xG: 1.40, xGA: 1.30, goalsAvg: 1.5, goalsConceded: 1.3, homeWinRate: 0.65, awayWinRate: 0.38, consistency: 65 },
  ],
  
  // ===== ESPAÑA - LA LIGA =====
  "La Liga": [
    { name: "Real Madrid", elo: 1880, strength: 94, form: "WWWWW", xG: 2.40, xGA: 0.80, goalsAvg: 2.5, goalsConceded: 0.8, homeWinRate: 0.88, awayWinRate: 0.72, consistency: 92 },
    { name: "Barcelona", elo: 1850, strength: 91, form: "WDWWW", xG: 2.20, xGA: 0.90, goalsAvg: 2.3, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.68, consistency: 85 },
    { name: "Atlético Madrid", elo: 1790, strength: 85, form: "WDWDW", xG: 1.70, xGA: 0.70, goalsAvg: 1.8, goalsConceded: 0.7, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 80 },
    { name: "Real Sociedad", elo: 1700, strength: 76, form: "WDLWD", xG: 1.40, xGA: 1.10, goalsAvg: 1.5, goalsConceded: 1.1, homeWinRate: 0.60, awayWinRate: 0.42, consistency: 68 },
    { name: "Villarreal", elo: 1680, strength: 74, form: "DLWWD", xG: 1.50, xGA: 1.20, goalsAvg: 1.6, goalsConceded: 1.2, homeWinRate: 0.58, awayWinRate: 0.40, consistency: 62 },
    { name: "Real Betis", elo: 1660, strength: 72, form: "WDLWL", xG: 1.30, xGA: 1.20, goalsAvg: 1.4, goalsConceded: 1.2, homeWinRate: 0.55, awayWinRate: 0.38, consistency: 58 },
  ],
  
  // ===== ITALIA - SERIE A =====
  "Serie A": [
    { name: "Inter Milan", elo: 1830, strength: 90, form: "WDWWW", xG: 2.20, xGA: 0.80, goalsAvg: 2.3, goalsConceded: 0.8, homeWinRate: 0.82, awayWinRate: 0.65, consistency: 85 },
    { name: "Napoli", elo: 1790, strength: 85, form: "WDWDW", xG: 2.00, xGA: 0.90, goalsAvg: 2.1, goalsConceded: 0.9, homeWinRate: 0.78, awayWinRate: 0.58, consistency: 80 },
    { name: "AC Milan", elo: 1770, strength: 83, form: "WLWDW", xG: 1.80, xGA: 1.00, goalsAvg: 1.9, goalsConceded: 1.0, homeWinRate: 0.72, awayWinRate: 0.52, consistency: 72 },
    { name: "Juventus", elo: 1760, strength: 82, form: "WDWDW", xG: 1.60, xGA: 0.70, goalsAvg: 1.7, goalsConceded: 0.7, homeWinRate: 0.70, awayWinRate: 0.55, consistency: 78 },
    { name: "Atalanta", elo: 1730, strength: 78, form: "WWLWD", xG: 1.90, xGA: 1.20, goalsAvg: 2.0, goalsConceded: 1.2, homeWinRate: 0.68, awayWinRate: 0.48, consistency: 70 },
    { name: "Roma", elo: 1700, strength: 75, form: "WDLWL", xG: 1.50, xGA: 1.20, goalsAvg: 1.6, goalsConceded: 1.2, homeWinRate: 0.62, awayWinRate: 0.42, consistency: 62 },
  ],
  
  // ===== ALEMANIA - BUNDESLIGA =====
  "Bundesliga": [
    { name: "Bayern Munich", elo: 1895, strength: 95, form: "WWWWW", xG: 2.80, xGA: 0.80, goalsAvg: 3.0, goalsConceded: 0.8, homeWinRate: 0.90, awayWinRate: 0.75, consistency: 92 },
    { name: "Borussia Dortmund", elo: 1810, strength: 88, form: "WDWWW", xG: 2.30, xGA: 1.20, goalsAvg: 2.4, goalsConceded: 1.2, homeWinRate: 0.78, awayWinRate: 0.58, consistency: 75 },
    { name: "RB Leipzig", elo: 1760, strength: 82, form: "WLWDW", xG: 1.90, xGA: 1.10, goalsAvg: 2.0, goalsConceded: 1.1, homeWinRate: 0.70, awayWinRate: 0.52, consistency: 72 },
    { name: "Bayer Leverkusen", elo: 1800, strength: 85, form: "WDWDW", xG: 2.10, xGA: 1.00, goalsAvg: 2.2, goalsConceded: 1.0, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 80 },
    { name: "VfB Stuttgart", elo: 1720, strength: 76, form: "WDWDW", xG: 1.80, xGA: 1.15, goalsAvg: 1.8, goalsConceded: 1.2, homeWinRate: 0.65, awayWinRate: 0.48, consistency: 70 },
  ],
  
  // ===== FRANCIA - LIGUE 1 =====
  "Ligue 1": [
    { name: "PSG", elo: 1900, strength: 96, form: "WWWWW", xG: 2.70, xGA: 0.70, goalsAvg: 2.8, goalsConceded: 0.7, homeWinRate: 0.92, awayWinRate: 0.78, consistency: 90 },
    { name: "Monaco", elo: 1740, strength: 80, form: "WDWDL", xG: 1.80, xGA: 1.20, goalsAvg: 1.9, goalsConceded: 1.2, homeWinRate: 0.65, awayWinRate: 0.48, consistency: 65 },
    { name: "Marseille", elo: 1720, strength: 78, form: "WLWDW", xG: 1.70, xGA: 1.10, goalsAvg: 1.8, goalsConceded: 1.1, homeWinRate: 0.62, awayWinRate: 0.45, consistency: 60 },
    { name: "Lille", elo: 1690, strength: 75, form: "WDLWD", xG: 1.40, xGA: 1.00, goalsAvg: 1.5, goalsConceded: 1.0, homeWinRate: 0.58, awayWinRate: 0.42, consistency: 68 },
    { name: "Lyon", elo: 1660, strength: 72, form: "DLWDL", xG: 1.40, xGA: 1.30, goalsAvg: 1.5, goalsConceded: 1.3, homeWinRate: 0.55, awayWinRate: 0.38, consistency: 55 },
  ],
  
  // ===== COLOMBIA - LIGA BETPLAY =====
  "Liga BetPlay": [
    { name: "Atlético Nacional", elo: 1650, strength: 85, form: "WDWDW", xG: 1.70, xGA: 0.90, goalsAvg: 1.8, goalsConceded: 0.9, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 78 },
    { name: "Millonarios", elo: 1620, strength: 82, form: "WLWDW", xG: 1.60, xGA: 1.00, goalsAvg: 1.7, goalsConceded: 1.0, homeWinRate: 0.72, awayWinRate: 0.52, consistency: 72 },
    { name: "América de Cali", elo: 1580, strength: 78, form: "DWLWD", xG: 1.40, xGA: 1.10, goalsAvg: 1.5, goalsConceded: 1.1, homeWinRate: 0.65, awayWinRate: 0.45, consistency: 65 },
    { name: "Junior de Barranquilla", elo: 1560, strength: 76, form: "WDLWL", xG: 1.30, xGA: 1.20, goalsAvg: 1.4, goalsConceded: 1.2, homeWinRate: 0.62, awayWinRate: 0.42, consistency: 60 },
    { name: "Deportivo Cali", elo: 1520, strength: 72, form: "LWDLW", xG: 1.20, xGA: 1.30, goalsAvg: 1.3, goalsConceded: 1.3, homeWinRate: 0.55, awayWinRate: 0.38, consistency: 55 },
    { name: "Independiente Santa Fe", elo: 1540, strength: 74, form: "WDLWL", xG: 1.20, xGA: 1.20, goalsAvg: 1.3, goalsConceded: 1.2, homeWinRate: 0.58, awayWinRate: 0.40, consistency: 58 },
    { name: "Deportes Tolima", elo: 1550, strength: 75, form: "WDWDW", xG: 1.30, xGA: 1.00, goalsAvg: 1.4, goalsConceded: 1.0, homeWinRate: 0.60, awayWinRate: 0.42, consistency: 68 },
    { name: "Once Caldas", elo: 1480, strength: 68, form: "DLWDL", xG: 1.10, xGA: 1.30, goalsAvg: 1.2, goalsConceded: 1.3, homeWinRate: 0.50, awayWinRate: 0.32, consistency: 52 },
    { name: "Independiente Medellín", elo: 1530, strength: 73, form: "WDLWD", xG: 1.30, xGA: 1.10, goalsAvg: 1.4, goalsConceded: 1.1, homeWinRate: 0.58, awayWinRate: 0.40, consistency: 62 },
  ],
  
  // ===== ARGENTINA - LIGA PROFESIONAL =====
  "Liga Profesional Argentina": [
    { name: "River Plate", elo: 1720, strength: 88, form: "WDWDW", xG: 1.90, xGA: 0.90, goalsAvg: 2.0, goalsConceded: 0.9, homeWinRate: 0.80, awayWinRate: 0.58, consistency: 78 },
    { name: "Boca Juniors", elo: 1700, strength: 86, form: "WDLWD", xG: 1.70, xGA: 0.90, goalsAvg: 1.8, goalsConceded: 0.9, homeWinRate: 0.78, awayWinRate: 0.55, consistency: 72 },
    { name: "Racing Club", elo: 1620, strength: 78, form: "WDLWW", xG: 1.50, xGA: 1.00, goalsAvg: 1.6, goalsConceded: 1.0, homeWinRate: 0.65, awayWinRate: 0.45, consistency: 65 },
    { name: "Independiente", elo: 1580, strength: 75, form: "DLWDL", xG: 1.30, xGA: 1.10, goalsAvg: 1.4, goalsConceded: 1.1, homeWinRate: 0.60, awayWinRate: 0.40, consistency: 55 },
    { name: "San Lorenzo", elo: 1550, strength: 72, form: "WDLWL", xG: 1.20, xGA: 1.20, goalsAvg: 1.3, goalsConceded: 1.2, homeWinRate: 0.58, awayWinRate: 0.38, consistency: 52 },
  ],
  
  // ===== BRASIL - BRASILEIRÃO =====
  "Brasileirão": [
    { name: "Flamengo", elo: 1750, strength: 90, form: "WDWDW", xG: 2.00, xGA: 0.90, goalsAvg: 2.1, goalsConceded: 0.9, homeWinRate: 0.82, awayWinRate: 0.60, consistency: 80 },
    { name: "Palmeiras", elo: 1740, strength: 88, form: "WDWDW", xG: 1.90, xGA: 0.80, goalsAvg: 2.0, goalsConceded: 0.8, homeWinRate: 0.80, awayWinRate: 0.58, consistency: 82 },
    { name: "Fluminense", elo: 1680, strength: 82, form: "WLWDW", xG: 1.60, xGA: 1.00, goalsAvg: 1.7, goalsConceded: 1.0, homeWinRate: 0.72, awayWinRate: 0.50, consistency: 70 },
    { name: "Grêmio", elo: 1640, strength: 78, form: "WDLWD", xG: 1.45, xGA: 1.10, goalsAvg: 1.5, goalsConceded: 1.1, homeWinRate: 0.68, awayWinRate: 0.45, consistency: 65 },
    { name: "Athletico Paranaense", elo: 1620, strength: 76, form: "WDWDL", xG: 1.40, xGA: 1.10, goalsAvg: 1.5, goalsConceded: 1.1, homeWinRate: 0.65, awayWinRate: 0.42, consistency: 62 },
  ],
  
  // ===== MÉXICO - LIGA MX =====
  "Liga MX": [
    { name: "América", elo: 1680, strength: 85, form: "WDWDW", xG: 1.80, xGA: 0.90, goalsAvg: 1.9, goalsConceded: 0.9, homeWinRate: 0.78, awayWinRate: 0.55, consistency: 75 },
    { name: "Chivas Guadalajara", elo: 1620, strength: 80, form: "WDLWD", xG: 1.50, xGA: 1.00, goalsAvg: 1.6, goalsConceded: 1.0, homeWinRate: 0.70, awayWinRate: 0.48, consistency: 68 },
    { name: "Rayados Monterrey", elo: 1600, strength: 78, form: "WDWDL", xG: 1.40, xGA: 1.10, goalsAvg: 1.5, goalsConceded: 1.1, homeWinRate: 0.68, awayWinRate: 0.45, consistency: 65 },
    { name: "Tigres UANL", elo: 1590, strength: 76, form: "WLWDW", xG: 1.40, xGA: 1.00, goalsAvg: 1.5, goalsConceded: 1.0, homeWinRate: 0.65, awayWinRate: 0.45, consistency: 68 },
    { name: "Cruz Azul", elo: 1570, strength: 75, form: "WDLWL", xG: 1.30, xGA: 1.10, goalsAvg: 1.4, goalsConceded: 1.1, homeWinRate: 0.62, awayWinRate: 0.42, consistency: 60 },
  ],
  
  // ===== CHAMPIONS LEAGUE =====
  "Champions League": [
    { name: "Real Madrid", elo: 1900, strength: 94, form: "WWWWW", xG: 2.50, xGA: 0.80, goalsAvg: 2.5, goalsConceded: 0.8, homeWinRate: 0.90, awayWinRate: 0.75, consistency: 95 },
    { name: "Manchester City", elo: 1905, strength: 95, form: "WWWDW", xG: 2.60, xGA: 0.85, goalsAvg: 2.7, goalsConceded: 0.9, homeWinRate: 0.88, awayWinRate: 0.78, consistency: 92 },
    { name: "Bayern Munich", elo: 1895, strength: 95, form: "WWWWW", xG: 2.80, xGA: 0.80, goalsAvg: 3.0, goalsConceded: 0.8, homeWinRate: 0.92, awayWinRate: 0.78, consistency: 90 },
    { name: "PSG", elo: 1890, strength: 96, form: "WWWWW", xG: 2.70, xGA: 0.70, goalsAvg: 2.8, goalsConceded: 0.7, homeWinRate: 0.92, awayWinRate: 0.80, consistency: 88 },
    { name: "Barcelona", elo: 1860, strength: 91, form: "WDWWW", xG: 2.20, xGA: 0.90, goalsAvg: 2.3, goalsConceded: 0.9, homeWinRate: 0.85, awayWinRate: 0.70, consistency: 82 },
    { name: "Inter Milan", elo: 1840, strength: 90, form: "WDWWW", xG: 2.20, xGA: 0.80, goalsAvg: 2.3, goalsConceded: 0.8, homeWinRate: 0.85, awayWinRate: 0.68, consistency: 85 },
    { name: "Arsenal", elo: 1850, strength: 90, form: "WDWWW", xG: 2.30, xGA: 0.95, goalsAvg: 2.4, goalsConceded: 1.0, homeWinRate: 0.85, awayWinRate: 0.72, consistency: 85 },
    { name: "Chelsea FC", elo: 1780, strength: 82, form: "WDWDL", xG: 1.70, xGA: 1.10, goalsAvg: 1.8, goalsConceded: 1.1, homeWinRate: 0.70, awayWinRate: 0.52, consistency: 65 },
  ],
  
  // ===== COPA LIBERTADORES =====
  "Copa Libertadores": [
    { name: "River Plate", elo: 1720, strength: 88, form: "WDWDW", xG: 1.90, xGA: 0.90, goalsAvg: 2.0, goalsConceded: 0.9, homeWinRate: 0.80, awayWinRate: 0.60, consistency: 78 },
    { name: "Boca Juniors", elo: 1700, strength: 86, form: "WDLWD", xG: 1.70, xGA: 0.90, goalsAvg: 1.8, goalsConceded: 0.9, homeWinRate: 0.78, awayWinRate: 0.58, consistency: 75 },
    { name: "Flamengo", elo: 1750, strength: 90, form: "WDWDW", xG: 2.00, xGA: 0.90, goalsAvg: 2.1, goalsConceded: 0.9, homeWinRate: 0.82, awayWinRate: 0.62, consistency: 80 },
    { name: "Palmeiras", elo: 1740, strength: 88, form: "WDWDW", xG: 1.90, xGA: 0.80, goalsAvg: 2.0, goalsConceded: 0.8, homeWinRate: 0.80, awayWinRate: 0.60, consistency: 82 },
    { name: "Fluminense", elo: 1690, strength: 82, form: "WLWDW", xG: 1.60, xGA: 1.00, goalsAvg: 1.7, goalsConceded: 1.0, homeWinRate: 0.72, awayWinRate: 0.52, consistency: 70 },
    { name: "Atlético Nacional", elo: 1660, strength: 85, form: "WDWDW", xG: 1.70, xGA: 0.90, goalsAvg: 1.8, goalsConceded: 0.9, homeWinRate: 0.75, awayWinRate: 0.55, consistency: 75 },
  ],
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
function findTeamInDatabase(teamName: string): { team: TeamData | null; league: string | null } {
  const normalizedTeam = teamName.toLowerCase().trim();
  
  for (const [leagueName, teams] of Object.entries(TEAMS_BY_LEAGUE)) {
    for (const team of teams) {
      if (team.name.toLowerCase() === normalizedTeam) {
        return { team, league: leagueName };
      }
      // Búsqueda flexible
      if (team.name.toLowerCase().includes(normalizedTeam) || 
          normalizedTeam.includes(team.name.toLowerCase())) {
        return { team, league: leagueName };
      }
    }
  }
  
  return { team: null, league: null };
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
    // Simular goles con distribución Poisson
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

// Distribución Poisson para simular goles
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
  // Pesos del motor v4.7 PRO
  const weights = {
    monteCarlo: 0.30,      // 30%
    elo: 0.20,             // 20%
    xGGap: 0.10,           // 10%
    offensive: 0.08,       // 8%
    defensive: 0.08,       // 8%
    form: 0.10,            // 10%
    homeAdvantage: 0.05,   // 5%
    consistency: 0.05,     // 5%
    volatility: 0.04,      // 4%
  };
  
  // Normalizar ELO diff (0-100)
  const eloScore = Math.min(100, Math.max(0, 50 + eloDiff / 8));
  
  // Normalizar xG Gap (0-100)
  const xGScore = Math.min(100, Math.max(0, 50 + xGGap * 20));
  
  // Volatilidad invertida (menos volatilidad = mejor score)
  const volatilityScore = 100 - volatility;
  
  // Score final ponderado
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
export function analyzeMatch(homeTeamName: string, awayTeamName: string, leagueName?: string): MatchAnalysis {
  const homeData = findTeamInDatabase(homeTeamName);
  const awayData = findTeamInDatabase(awayTeamName);
  
  // Valores por defecto si no encuentra el equipo
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
  
  const homeTeam = homeData.team || { ...defaultTeam, name: homeTeamName };
  const awayTeam = awayData.team || { ...defaultTeam, name: awayTeamName };
  const league = homeData.league || awayData.league || leagueName || "Liga Desconocida";
  
  // ===== CALCULAR MÉTRICAS =====
  const eloDiff = homeTeam.elo - awayTeam.elo;
  const xGTotal = homeTeam.xG + awayTeam.xG;
  const xGGap = homeTeam.xG - awayTeam.xGA;
  
  // Forma reciente (W=1, D=0.5, L=0)
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
  
  // Poder ofensivo y defensivo (0-100)
  const offensivePower = Math.min(100, (homeTeam.xG / 2.5) * 80 + (homeTeam.goalsAvg / 3) * 20);
  const defensiveSolid = Math.min(100, 100 - (homeTeam.xGA / 2) * 50 - (homeTeam.goalsConceded / 2) * 50);
  
  // Ventaja local (0-100)
  const homeAdvantage = homeTeam.homeWinRate * 100;
  
  // Volatilidad (0-100) - basada en consistencia y diferencia de ELO
  const volatility = Math.max(0, 100 - homeTeam.consistency + Math.abs(eloDiff) / 30);
  
  // Value Bet
  const impliedProb = 1 / (1.25); // Cuota típica de over 1.5
  const valueBet = Math.round((mc.over15Prob - impliedProb) * 100);
  
  // Score total
  const score = calculateMatchScore(
    eloDiff,
    xGGap,
    offensivePower,
    defensiveSolid,
    homeFormScore,
    homeAdvantage,
    homeTeam.consistency,
    volatility,
    mc.over15Prob
  );
  
  // ===== GENERAR PICK =====
  let bestPick = {
    label: 'Más de 1.5 goles',
    probability: mc.over15Prob,
    odds: Math.round((1 / mc.over15Prob) * 100) / 100,
    reasoning: `xG Total: ${xGTotal.toFixed(2)} (${homeTeam.name} ${homeTeam.xG.toFixed(2)} - ${awayTeam.name} ${awayTeam.xG.toFixed(2)})`,
  };
  
  // Si hay diferencia de ELO grande, sugerir doble oportunidad
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
      reasoning: `xG Total: ${xGTotal.toFixed(2)}. Monte Carlo: ${Math.round(mc.over15Prob * 100)}% probabilidad`,
    };
  } else if (mc.over25Prob > 0.55) {
    bestPick = {
      label: 'Más de 2.5 goles',
      probability: mc.over25Prob,
      odds: Math.round((1 / mc.over25Prob) * 100) / 100,
      reasoning: `xG Total: ${xGTotal.toFixed(2)}. Monte Carlo: ${Math.round(mc.over25Prob * 100)}% probabilidad`,
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
}): MatchPick {
  const analysis = analyzeMatch(match.homeTeam, match.awayTeam, match.league);
  
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
  };
}

// ==========================================
// GENERAR COMBINADA DESDE PARTIDOS
// ==========================================
export function generateCombinadaFromMatches(
  selectedMatches: { id: string; homeTeam: string; awayTeam: string; league: string; matchDate: string }[]
): Combinada {
  // Analizar todos los partidos
  const allPicks = selectedMatches.map(match => generatePickForMatch(match));
  
  // FILTRAR: Solo picks con Score > 65 (BAJO RIESGO)
  const goodPicks = allPicks.filter(p => p.score >= 65);
  
  // Ordenar por score descendente
  goodPicks.sort((a, b) => b.score - a.score);
  
  // Limitar a los mejores
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

// ==========================================
// EXPORTS
// ==========================================
export { TEAMS_BY_LEAGUE };
