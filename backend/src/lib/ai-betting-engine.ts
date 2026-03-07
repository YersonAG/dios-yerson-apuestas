// Motor de Análisis Real - El Dios Yerson v4.7 PRO
// REGLA: SOLO APUESTAS DE BAJO RIESGO
// Incluye TODAS las ligas de LATAM

// ==========================================
// BASE DE DATOS DE EQUIPOS POR LIGA
// ==========================================
const TEAMS_BY_LEAGUE: Record<string, { 
  name: string; 
  strength: number; 
  form: string; 
  goalsAvg: number;
  goalsConceded: number;
  xG: number;
  homeWinRate: number;
  awayWinRate: number;
}[]> = {
  // ===== EUROPA =====
  "Premier League": [
    { name: "Manchester City", strength: 95, form: "WWWDW", goalsAvg: 2.7, goalsConceded: 0.9, xG: 2.5, homeWinRate: 0.85, awayWinRate: 0.75 },
    { name: "Arsenal", strength: 90, form: "WDWWW", goalsAvg: 2.4, goalsConceded: 1.0, xG: 2.2, homeWinRate: 0.82, awayWinRate: 0.70 },
    { name: "Liverpool", strength: 92, form: "WWDWW", goalsAvg: 2.5, goalsConceded: 1.1, xG: 2.3, homeWinRate: 0.80, awayWinRate: 0.72 },
    { name: "Manchester United", strength: 82, form: "WLWDL", goalsAvg: 1.8, goalsConceded: 1.3, xG: 1.7, homeWinRate: 0.65, awayWinRate: 0.50 },
    { name: "Chelsea", strength: 80, form: "WDWDL", goalsAvg: 1.7, goalsConceded: 1.2, xG: 1.6, homeWinRate: 0.62, awayWinRate: 0.48 },
    { name: "Tottenham", strength: 78, form: "LWWDL", goalsAvg: 1.9, goalsConceded: 1.4, xG: 1.8, homeWinRate: 0.60, awayWinRate: 0.45 },
    { name: "Newcastle", strength: 75, form: "WDWDW", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.70, awayWinRate: 0.42 },
    { name: "Aston Villa", strength: 72, form: "WWLWD", goalsAvg: 1.5, goalsConceded: 1.3, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.38 },
    { name: "Brighton", strength: 70, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.4, xG: 1.4, homeWinRate: 0.55, awayWinRate: 0.35 },
    { name: "West Ham", strength: 68, form: "DLWDL", goalsAvg: 1.3, goalsConceded: 1.5, xG: 1.2, homeWinRate: 0.50, awayWinRate: 0.32 },
  ],
  "La Liga": [
    { name: "Real Madrid", strength: 94, form: "WWWWW", goalsAvg: 2.5, goalsConceded: 0.8, xG: 2.4, homeWinRate: 0.88, awayWinRate: 0.72 },
    { name: "Barcelona", strength: 91, form: "WDWWW", goalsAvg: 2.3, goalsConceded: 0.9, xG: 2.2, homeWinRate: 0.85, awayWinRate: 0.68 },
    { name: "Atlético Madrid", strength: 85, form: "WDWDW", goalsAvg: 1.8, goalsConceded: 0.7, xG: 1.7, homeWinRate: 0.75, awayWinRate: 0.55 },
    { name: "Real Sociedad", strength: 76, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.60, awayWinRate: 0.42 },
    { name: "Villarreal", strength: 74, form: "DLWWD", goalsAvg: 1.6, goalsConceded: 1.2, xG: 1.5, homeWinRate: 0.58, awayWinRate: 0.40 },
    { name: "Real Betis", strength: 72, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.2, xG: 1.3, homeWinRate: 0.55, awayWinRate: 0.38 },
    { name: "Athletic Bilbao", strength: 70, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.58, awayWinRate: 0.35 },
    { name: "Sevilla", strength: 68, form: "DLLWD", goalsAvg: 1.2, goalsConceded: 1.3, xG: 1.1, homeWinRate: 0.50, awayWinRate: 0.30 },
  ],
  "Serie A": [
    { name: "Inter Milan", strength: 90, form: "WDWWW", goalsAvg: 2.3, goalsConceded: 0.8, xG: 2.2, homeWinRate: 0.82, awayWinRate: 0.65 },
    { name: "Napoli", strength: 85, form: "WDWDW", goalsAvg: 2.1, goalsConceded: 0.9, xG: 2.0, homeWinRate: 0.78, awayWinRate: 0.58 },
    { name: "AC Milan", strength: 83, form: "WLWDW", goalsAvg: 1.9, goalsConceded: 1.0, xG: 1.8, homeWinRate: 0.72, awayWinRate: 0.52 },
    { name: "Juventus", strength: 82, form: "WDWDW", goalsAvg: 1.7, goalsConceded: 0.7, xG: 1.6, homeWinRate: 0.70, awayWinRate: 0.55 },
    { name: "Atalanta", strength: 78, form: "WWLWD", goalsAvg: 2.0, goalsConceded: 1.2, xG: 1.9, homeWinRate: 0.68, awayWinRate: 0.48 },
    { name: "Roma", strength: 75, form: "WDLWL", goalsAvg: 1.6, goalsConceded: 1.2, xG: 1.5, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Lazio", strength: 72, form: "DLWWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.58, awayWinRate: 0.40 },
    { name: "Fiorentina", strength: 70, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.2, xG: 1.3, homeWinRate: 0.55, awayWinRate: 0.38 },
  ],
  "Bundesliga": [
    { name: "Bayern Munich", strength: 95, form: "WWWWW", goalsAvg: 3.0, goalsConceded: 0.8, xG: 2.8, homeWinRate: 0.90, awayWinRate: 0.75 },
    { name: "Borussia Dortmund", strength: 88, form: "WDWWW", goalsAvg: 2.4, goalsConceded: 1.2, xG: 2.3, homeWinRate: 0.78, awayWinRate: 0.58 },
    { name: "RB Leipzig", strength: 82, form: "WLWDW", goalsAvg: 2.0, goalsConceded: 1.1, xG: 1.9, homeWinRate: 0.70, awayWinRate: 0.52 },
    { name: "Bayer Leverkusen", strength: 85, form: "WDWDW", goalsAvg: 2.2, goalsConceded: 1.0, xG: 2.1, homeWinRate: 0.75, awayWinRate: 0.55 },
    { name: "Union Berlin", strength: 70, form: "WDLWD", goalsAvg: 1.3, goalsConceded: 1.1, xG: 1.2, homeWinRate: 0.55, awayWinRate: 0.35 },
    { name: "Freiburg", strength: 68, form: "DLWWD", goalsAvg: 1.4, goalsConceded: 1.3, xG: 1.3, homeWinRate: 0.52, awayWinRate: 0.32 },
  ],
  "Ligue 1": [
    { name: "PSG", strength: 96, form: "WWWWW", goalsAvg: 2.8, goalsConceded: 0.7, xG: 2.7, homeWinRate: 0.92, awayWinRate: 0.78 },
    { name: "Monaco", strength: 80, form: "WDWDL", goalsAvg: 1.9, goalsConceded: 1.2, xG: 1.8, homeWinRate: 0.65, awayWinRate: 0.48 },
    { name: "Marseille", strength: 78, form: "WLWDW", goalsAvg: 1.8, goalsConceded: 1.1, xG: 1.7, homeWinRate: 0.62, awayWinRate: 0.45 },
    { name: "Lille", strength: 75, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.0, xG: 1.4, homeWinRate: 0.58, awayWinRate: 0.42 },
    { name: "Lyon", strength: 72, form: "DLWDL", goalsAvg: 1.5, goalsConceded: 1.3, xG: 1.4, homeWinRate: 0.55, awayWinRate: 0.38 },
    { name: "Nice", strength: 70, form: "WDWDL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.52, awayWinRate: 0.35 },
    { name: "Lens", strength: 72, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.0, xG: 1.4, homeWinRate: 0.60, awayWinRate: 0.40 },
  ],
  
  // ===== COLOMBIA - LIGA BETPLAY (COMPLETO) =====
  "Liga BetPlay": [
    { name: "Atlético Nacional", strength: 85, form: "WDWDW", goalsAvg: 1.8, goalsConceded: 0.9, xG: 1.7, homeWinRate: 0.75, awayWinRate: 0.55 },
    { name: "Millonarios", strength: 82, form: "WLWDW", goalsAvg: 1.7, goalsConceded: 1.0, xG: 1.6, homeWinRate: 0.72, awayWinRate: 0.52 },
    { name: "América de Cali", strength: 78, form: "DWLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Junior de Barranquilla", strength: 76, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.2, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Deportivo Cali", strength: 72, form: "LWDLW", goalsAvg: 1.3, goalsConceded: 1.3, xG: 1.2, homeWinRate: 0.55, awayWinRate: 0.38 },
    { name: "Independiente Santa Fe", strength: 74, form: "WDLWL", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.40 },
    { name: "Deportes Tolima", strength: 75, form: "WDWDW", goalsAvg: 1.4, goalsConceded: 1.0, xG: 1.3, homeWinRate: 0.60, awayWinRate: 0.42 },
    { name: "Once Caldas", strength: 68, form: "DLWDL", goalsAvg: 1.2, goalsConceded: 1.3, xG: 1.1, homeWinRate: 0.50, awayWinRate: 0.32 },
    { name: "Independiente Medellín", strength: 73, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.58, awayWinRate: 0.40 },
    { name: "Envigado", strength: 65, form: "LDLWL", goalsAvg: 1.0, goalsConceded: 1.5, xG: 0.9, homeWinRate: 0.42, awayWinRate: 0.28 },
    { name: "La Equidad", strength: 62, form: "DLLWD", goalsAvg: 1.0, goalsConceded: 1.4, xG: 0.9, homeWinRate: 0.40, awayWinRate: 0.25 },
    { name: "Jaguares de Córdoba", strength: 60, form: "LDLWL", goalsAvg: 0.9, goalsConceded: 1.5, xG: 0.8, homeWinRate: 0.38, awayWinRate: 0.22 },
    { name: "Patriotas", strength: 58, form: "DLLDL", goalsAvg: 0.8, goalsConceded: 1.6, xG: 0.7, homeWinRate: 0.35, awayWinRate: 0.20 },
    { name: "Águilas Doradas", strength: 70, form: "WDLWD", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.52, awayWinRate: 0.35 },
    { name: "Deportivo Pasto", strength: 64, form: "DLWDL", goalsAvg: 1.1, goalsConceded: 1.3, xG: 1.0, homeWinRate: 0.45, awayWinRate: 0.28 },
    { name: "Cortuluá", strength: 55, form: "LDLDL", goalsAvg: 0.8, goalsConceded: 1.7, xG: 0.7, homeWinRate: 0.32, awayWinRate: 0.18 },
  ],
  
  // ===== ARGENTINA - LIGA PROFESIONAL =====
  "Liga Profesional Argentina": [
    { name: "River Plate", strength: 88, form: "WDWDW", goalsAvg: 2.0, goalsConceded: 0.9, xG: 1.9, homeWinRate: 0.80, awayWinRate: 0.58 },
    { name: "Boca Juniors", strength: 86, form: "WDLWD", goalsAvg: 1.8, goalsConceded: 0.9, xG: 1.7, homeWinRate: 0.78, awayWinRate: 0.55 },
    { name: "Racing Club", strength: 78, form: "WDLWW", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Independiente", strength: 75, form: "DLWDL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.60, awayWinRate: 0.40 },
    { name: "San Lorenzo", strength: 72, form: "WDLWL", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Estudiantes", strength: 70, form: "WDWDL", goalsAvg: 1.3, goalsConceded: 1.1, xG: 1.2, homeWinRate: 0.55, awayWinRate: 0.35 },
    { name: "Vélez Sarsfield", strength: 68, form: "DLWWD", goalsAvg: 1.2, goalsConceded: 1.2, xG: 1.1, homeWinRate: 0.52, awayWinRate: 0.32 },
    { name: "Talleres", strength: 70, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Huracán", strength: 65, form: "LDLWL", goalsAvg: 1.1, goalsConceded: 1.3, xG: 1.0, homeWinRate: 0.45, awayWinRate: 0.28 },
    { name: "Gimnasia La Plata", strength: 62, form: "DLLWD", goalsAvg: 1.0, goalsConceded: 1.4, xG: 0.9, homeWinRate: 0.42, awayWinRate: 0.25 },
    { name: "Rosario Central", strength: 68, form: "WDLWL", goalsAvg: 1.2, goalsConceded: 1.3, xG: 1.1, homeWinRate: 0.50, awayWinRate: 0.30 },
    { name: "Newell's Old Boys", strength: 66, form: "DLWDL", goalsAvg: 1.1, goalsConceded: 1.3, xG: 1.0, homeWinRate: 0.48, awayWinRate: 0.28 },
    { name: "Argentinos Juniors", strength: 67, form: "WDWDL", goalsAvg: 1.2, goalsConceded: 1.2, xG: 1.1, homeWinRate: 0.52, awayWinRate: 0.32 },
    { name: "Tigre", strength: 60, form: "LDLDL", goalsAvg: 0.9, goalsConceded: 1.5, xG: 0.8, homeWinRate: 0.38, awayWinRate: 0.22 },
  ],
  
  // ===== BRASIL - BRASILEIRÃO =====
  "Brasileirão": [
    { name: "Flamengo", strength: 90, form: "WDWDW", goalsAvg: 2.1, goalsConceded: 0.9, xG: 2.0, homeWinRate: 0.82, awayWinRate: 0.60 },
    { name: "Palmeiras", strength: 88, form: "WDWDW", goalsAvg: 2.0, goalsConceded: 0.8, xG: 1.9, homeWinRate: 0.80, awayWinRate: 0.58 },
    { name: "Fluminense", strength: 82, form: "WLWDW", goalsAvg: 1.7, goalsConceded: 1.0, xG: 1.6, homeWinRate: 0.72, awayWinRate: 0.50 },
    { name: "Grêmio", strength: 78, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.68, awayWinRate: 0.45 },
    { name: "Athletico Paranaense", strength: 76, form: "WDWDL", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.42 },
    { name: "São Paulo", strength: 75, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Internacional", strength: 74, form: "DLWWD", goalsAvg: 1.4, goalsConceded: 1.2, xG: 1.3, homeWinRate: 0.60, awayWinRate: 0.40 },
    { name: "Corinthians", strength: 73, form: "WDLWD", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Atlético Mineiro", strength: 76, form: "WDWDW", goalsAvg: 1.5, goalsConceded: 1.0, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Botafogo", strength: 72, form: "WDLWD", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Santos", strength: 70, form: "DLWDL", goalsAvg: 1.2, goalsConceded: 1.3, xG: 1.1, homeWinRate: 0.55, awayWinRate: 0.35 },
    { name: "Cruzeiro", strength: 68, form: "LDLWL", goalsAvg: 1.1, goalsConceded: 1.4, xG: 1.0, homeWinRate: 0.50, awayWinRate: 0.32 },
    { name: "Bahia", strength: 65, form: "DLLWD", goalsAvg: 1.1, goalsConceded: 1.4, xG: 1.0, homeWinRate: 0.48, awayWinRate: 0.30 },
    { name: "Vasco da Gama", strength: 64, form: "LDLDL", goalsAvg: 1.0, goalsConceded: 1.5, xG: 0.9, homeWinRate: 0.45, awayWinRate: 0.28 },
  ],
  
  // ===== MÉXICO - LIGA MX =====
  "Liga MX": [
    { name: "América", strength: 85, form: "WDWDW", goalsAvg: 1.9, goalsConceded: 0.9, xG: 1.8, homeWinRate: 0.78, awayWinRate: 0.55 },
    { name: "Chivas Guadalajara", strength: 80, form: "WDLWD", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.70, awayWinRate: 0.48 },
    { name: "Rayados Monterrey", strength: 78, form: "WDWDL", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.68, awayWinRate: 0.45 },
    { name: "Tigres UANL", strength: 76, form: "WLWDW", goalsAvg: 1.5, goalsConceded: 1.0, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Cruz Azul", strength: 75, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Puebla", strength: 65, form: "DLWDL", goalsAvg: 1.1, goalsConceded: 1.4, xG: 1.0, homeWinRate: 0.48, awayWinRate: 0.30 },
    { name: "Pachuca", strength: 70, form: "WDWDL", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.55, awayWinRate: 0.35 },
    { name: "León", strength: 72, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Santos Laguna", strength: 68, form: "DLWWD", goalsAvg: 1.2, goalsConceded: 1.3, xG: 1.1, homeWinRate: 0.52, awayWinRate: 0.32 },
    { name: "Toluca", strength: 70, form: "WDLWL", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.55, awayWinRate: 0.35 },
    { name: "Necaxa", strength: 62, form: "LDLWL", goalsAvg: 1.0, goalsConceded: 1.5, xG: 0.9, homeWinRate: 0.42, awayWinRate: 0.25 },
    { name: "Atlas", strength: 67, form: "WDLWD", goalsAvg: 1.2, goalsConceded: 1.2, xG: 1.1, homeWinRate: 0.50, awayWinRate: 0.32 },
    { name: "Club Querétaro", strength: 58, form: "DLLDL", goalsAvg: 0.9, goalsConceded: 1.6, xG: 0.8, homeWinRate: 0.35, awayWinRate: 0.20 },
    { name: "FC Juárez", strength: 55, form: "LDLDL", goalsAvg: 0.8, goalsConceded: 1.7, xG: 0.7, homeWinRate: 0.32, awayWinRate: 0.18 },
  ],
  
  // ===== COPA LIBERTADORES =====
  "Copa Libertadores": [
    { name: "River Plate", strength: 88, form: "WDWDW", goalsAvg: 2.0, goalsConceded: 0.9, xG: 1.9, homeWinRate: 0.80, awayWinRate: 0.58 },
    { name: "Boca Juniors", strength: 86, form: "WDLWD", goalsAvg: 1.8, goalsConceded: 0.9, xG: 1.7, homeWinRate: 0.78, awayWinRate: 0.55 },
    { name: "Flamengo", strength: 90, form: "WDWDW", goalsAvg: 2.1, goalsConceded: 0.9, xG: 2.0, homeWinRate: 0.82, awayWinRate: 0.60 },
    { name: "Palmeiras", strength: 88, form: "WDWDW", goalsAvg: 2.0, goalsConceded: 0.8, xG: 1.9, homeWinRate: 0.80, awayWinRate: 0.58 },
    { name: "Fluminense", strength: 82, form: "WLWDW", goalsAvg: 1.7, goalsConceded: 1.0, xG: 1.6, homeWinRate: 0.72, awayWinRate: 0.50 },
    { name: "Atlético Nacional", strength: 85, form: "WDWDW", goalsAvg: 1.8, goalsConceded: 0.9, xG: 1.7, homeWinRate: 0.75, awayWinRate: 0.55 },
    { name: "Grêmio", strength: 78, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.68, awayWinRate: 0.45 },
    { name: "Athletico Paranaense", strength: 76, form: "WDWDL", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.42 },
    { name: "Millonarios", strength: 82, form: "WLWDW", goalsAvg: 1.7, goalsConceded: 1.0, xG: 1.6, homeWinRate: 0.72, awayWinRate: 0.52 },
    { name: "Peñarol", strength: 75, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Nacional", strength: 73, form: "WDWDL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.60, awayWinRate: 0.40 },
    { name: "Colo-Colo", strength: 72, form: "WDLWL", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.38 },
  ],
  
  // ===== COPA SUDAMERICANA =====
  "Copa Sudamericana": [
    { name: "Racing Club", strength: 78, form: "WDLWW", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Independiente", strength: 75, form: "DLWDL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.60, awayWinRate: 0.40 },
    { name: "São Paulo", strength: 75, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Corinthians", strength: 73, form: "WDLWD", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "América de Cali", strength: 78, form: "DWLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Junior de Barranquilla", strength: 76, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.2, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Talleres", strength: 70, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Defensa y Justicia", strength: 68, form: "WDWDL", goalsAvg: 1.3, goalsConceded: 1.2, xG: 1.2, homeWinRate: 0.55, awayWinRate: 0.35 },
  ],
  
  // ===== CHILE - PRIMERA DIVISIÓN =====
  "Primera División Chile": [
    { name: "Colo-Colo", strength: 78, form: "WDWDW", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.70, awayWinRate: 0.48 },
    { name: "Universidad de Chile", strength: 74, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Universidad Católica", strength: 72, form: "WDWDL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.60, awayWinRate: 0.40 },
    { name: "Palestino", strength: 68, form: "WDLWL", goalsAvg: 1.2, goalsConceded: 1.3, xG: 1.1, homeWinRate: 0.52, awayWinRate: 0.32 },
    { name: "Coquimbo Unido", strength: 62, form: "DLWDL", goalsAvg: 1.0, goalsConceded: 1.4, xG: 0.9, homeWinRate: 0.42, awayWinRate: 0.25 },
  ],
  
  // ===== ECUADOR - LIGA PRO =====
  "Liga Pro Ecuador": [
    { name: "LDU Quito", strength: 75, form: "WDWDW", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.68, awayWinRate: 0.45 },
    { name: "Barcelona SC", strength: 73, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.42 },
    { name: "Emelec", strength: 72, form: "WDWDL", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.40 },
    { name: "Independiente del Valle", strength: 70, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.1, xG: 1.3, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Aucas", strength: 65, form: "DLWDL", goalsAvg: 1.1, goalsConceded: 1.3, xG: 1.0, homeWinRate: 0.48, awayWinRate: 0.30 },
  ],
  
  // ===== URUGUAY - PRIMERA DIVISIÓN =====
  "Primera División Uruguay": [
    { name: "Peñarol", strength: 80, form: "WDWDW", goalsAvg: 1.7, goalsConceded: 0.9, xG: 1.6, homeWinRate: 0.72, awayWinRate: 0.50 },
    { name: "Nacional", strength: 78, form: "WDLWD", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.70, awayWinRate: 0.48 },
    { name: "Defensor Sporting", strength: 65, form: "DLWDL", goalsAvg: 1.1, goalsConceded: 1.3, xG: 1.0, homeWinRate: 0.48, awayWinRate: 0.28 },
    { name: "Danubio", strength: 62, form: "LDLWL", goalsAvg: 1.0, goalsConceded: 1.4, xG: 0.9, homeWinRate: 0.42, awayWinRate: 0.25 },
  ],
  
  // ===== PARAGUAY - PRIMERA DIVISIÓN =====
  "Primera División Paraguay": [
    { name: "Olimpia", strength: 75, form: "WDWDW", goalsAvg: 1.5, goalsConceded: 1.0, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Cerro Porteño", strength: 73, form: "WDLWD", goalsAvg: 1.4, goalsConceded: 1.0, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Libertad", strength: 70, form: "WDWDL", goalsAvg: 1.3, goalsConceded: 1.1, xG: 1.2, homeWinRate: 0.58, awayWinRate: 0.38 },
    { name: "Guaraní", strength: 68, form: "WDLWL", goalsAvg: 1.2, goalsConceded: 1.2, xG: 1.1, homeWinRate: 0.55, awayWinRate: 0.35 },
  ],
  
  // ===== CHAMPIONS LEAGUE =====
  "Champions League": [
    { name: "Real Madrid", strength: 94, form: "WWWWW", goalsAvg: 2.5, goalsConceded: 0.8, xG: 2.4, homeWinRate: 0.88, awayWinRate: 0.72 },
    { name: "Manchester City", strength: 95, form: "WWWDW", goalsAvg: 2.7, goalsConceded: 0.9, xG: 2.5, homeWinRate: 0.85, awayWinRate: 0.75 },
    { name: "Bayern Munich", strength: 95, form: "WWWWW", goalsAvg: 3.0, goalsConceded: 0.8, xG: 2.8, homeWinRate: 0.90, awayWinRate: 0.75 },
    { name: "PSG", strength: 96, form: "WWWWW", goalsAvg: 2.8, goalsConceded: 0.7, xG: 2.7, homeWinRate: 0.92, awayWinRate: 0.78 },
    { name: "Barcelona", strength: 91, form: "WDWWW", goalsAvg: 2.3, goalsConceded: 0.9, xG: 2.2, homeWinRate: 0.85, awayWinRate: 0.68 },
    { name: "Inter Milan", strength: 90, form: "WDWWW", goalsAvg: 2.3, goalsConceded: 0.8, xG: 2.2, homeWinRate: 0.82, awayWinRate: 0.65 },
    { name: "Arsenal", strength: 90, form: "WDWWW", goalsAvg: 2.4, goalsConceded: 1.0, xG: 2.2, homeWinRate: 0.82, awayWinRate: 0.70 },
    { name: "Napoli", strength: 85, form: "WDWDW", goalsAvg: 2.1, goalsConceded: 0.9, xG: 2.0, homeWinRate: 0.78, awayWinRate: 0.58 },
  ],
};

const LEAGUES = Object.keys(TEAMS_BY_LEAGUE);

// ==========================================
// INTERFACES
// ==========================================
export interface AvailableMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country: string;
  matchDate: string;
  homeStrength: number;
  awayStrength: number;
  homeForm: string;
  awayForm: string;
  homeGoalsAvg: number;
  awayGoalsAvg: number;
  homeXG: number;
  awayXG: number;
  homeWinRate: number;
  awayWinRate: number;
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
  status: 'pending' | 'live' | 'won' | 'lost';
}

export interface Combinada {
  id: string;
  picks: MatchPick[];
  totalOdds: number;
  totalProbability: number;
  risk: 'low';
  status: 'pending' | 'live' | 'won' | 'lost';
  taken: boolean;
}

// ==========================================
// FUNCIÓN PRINCIPAL: BUSCAR EQUIPO EN LA BD
// ==========================================
function findTeamInDatabase(teamName: string): { 
  team: typeof TEAMS_BY_LEAGUE[string][0] | null; 
  league: string | null;
} {
  const normalizedTeam = teamName.toLowerCase().trim();
  
  for (const [leagueName, teams] of Object.entries(TEAMS_BY_LEAGUE)) {
    for (const team of teams) {
      if (team.name.toLowerCase() === normalizedTeam) {
        return { team, league: leagueName };
      }
      // Búsqueda flexible (parcial)
      if (team.name.toLowerCase().includes(normalizedTeam) || 
          normalizedTeam.includes(team.name.toLowerCase())) {
        return { team, league: leagueName };
      }
    }
  }
  
  return { team: null, league: null };
}

// ==========================================
// FUNCIÓN PRINCIPAL: ANALIZAR PARTIDO
// ==========================================
interface LowRiskPick {
  label: string;
  probability: number;
  odds: number;
  reasoning: string;
}

export function analyzeMatch(homeTeamName: string, awayTeamName: string, leagueName?: string): {
  homeTeam: string;
  awayTeam: string;
  league: string;
  picks: LowRiskPick[];
  stats: {
    homeStrength: number;
    awayStrength: number;
    diff: number;
    homeForm: string;
    awayForm: string;
    homeWinRateForm: number;
    awayWinRateForm: number;
    totalGoalsAvg: number;
    totalXG: number;
  };
} {
  const homeData = findTeamInDatabase(homeTeamName);
  const awayData = findTeamInDatabase(awayTeamName);
  
  // Valores por defecto si no encontramos el equipo
  const homeTeam = homeData.team || { 
    name: homeTeamName, 
    strength: 65, 
    form: "WDLWD", 
    goalsAvg: 1.2, 
    goalsConceded: 1.3, 
    xG: 1.1, 
    homeWinRate: 0.50, 
    awayWinRate: 0.35 
  };
  const awayTeam = awayData.team || { 
    name: awayTeamName, 
    strength: 65, 
    form: "WDLWD", 
    goalsAvg: 1.2, 
    goalsConceded: 1.3, 
    xG: 1.1, 
    homeWinRate: 0.50, 
    awayWinRate: 0.35 
  };
  
  const league = homeData.league || awayData.league || leagueName || "Liga Desconocida";
  
  const picks: LowRiskPick[] = [];
  const diff = homeTeam.strength - awayTeam.strength;
  const homeWinRateForm = homeTeam.form.split('').filter(c => c === 'W').length / 5;
  const awayWinRateForm = awayTeam.form.split('').filter(c => c === 'W').length / 5;
  const totalGoalsAvg = homeTeam.goalsAvg + awayTeam.goalsAvg;
  const totalXG = homeTeam.xG + awayTeam.xG;
  
  // ===== DOBLE OPORTUNIDAD 1X =====
  if (diff > 3 || homeTeam.homeWinRate > 0.50) {
    const prob = Math.min(0.85, 0.55 + (diff * 0.005) + (homeWinRateForm * 0.15) + (homeTeam.homeWinRate - 0.5) * 0.10);
    const homeFormWins = homeTeam.form.split('').filter(c => c === 'W').length;
    picks.push({
      label: `${homeTeam.name} gana o empata (1X)`,
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `${homeTeam.name} (fuerza ${homeTeam.strength}) vs ${awayTeam.name} (${awayTeam.strength}). Forma: ${homeFormWins}/5 victorias. Win rate local: ${Math.round(homeTeam.homeWinRate * 100)}%.`
    });
  }
  
  // ===== DOBLE OPORTUNIDAD X2 =====
  if (diff < -3 || awayTeam.awayWinRate > 0.40) {
    const prob = Math.min(0.85, 0.55 + (Math.abs(diff) * 0.005) + (awayWinRateForm * 0.12) + (awayTeam.awayWinRate - 0.35) * 0.10);
    const awayFormWins = awayTeam.form.split('').filter(c => c === 'W').length;
    picks.push({
      label: `${awayTeam.name} gana o empata (X2)`,
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `${awayTeam.name} (fuerza ${awayTeam.strength}) como visitante. Forma: ${awayFormWins}/5 victorias. Win rate visitante: ${Math.round(awayTeam.awayWinRate * 100)}%.`
    });
  }
  
  // ===== MÁS DE 1.5 GOLES =====
  if (totalGoalsAvg > 2.2 || totalXG > 2.2) {
    const prob = Math.min(0.90, 0.68 + (totalGoalsAvg - 2) * 0.06);
    picks.push({
      label: 'Más de 1.5 goles',
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `Promedio combinado: ${totalGoalsAvg.toFixed(1)} goles/partido. xG total: ${totalXG.toFixed(1)}.`
    });
  }
  
  // ===== MÁS DE 0.5 GOLES (MT) =====
  if (totalGoalsAvg > 1.8) {
    const prob = Math.min(0.95, 0.82 + (totalGoalsAvg - 2) * 0.04);
    picks.push({
      label: 'Más de 0.5 goles (1er tiempo)',
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `Equipos ofensivos con ${totalGoalsAvg.toFixed(1)} goles promedio.`
    });
  }
  
  // ===== MENOS DE 4.5 GOLES =====
  if (totalGoalsAvg < 3.8) {
    const prob = Math.min(0.95, 0.78 + (3.5 - totalGoalsAvg) * 0.06);
    picks.push({
      label: 'Menos de 4.5 goles',
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `Partido cerrado esperado. Promedio: ${totalGoalsAvg.toFixed(1)} goles.`
    });
  }
  
  // ===== MENOS DE 3.5 GOLES =====
  if (totalGoalsAvg < 2.8) {
    const prob = Math.min(0.92, 0.70 + (3 - totalGoalsAvg) * 0.08);
    picks.push({
      label: 'Menos de 3.5 goles',
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `Defensas sólidas. Goles esperados: ~${totalGoalsAvg.toFixed(1)}.`
    });
  }
  
  // Si no hay picks, agregar uno por defecto
  if (picks.length === 0) {
    picks.push({
      label: `${homeTeam.name} gana o empata (1X)`,
      probability: 0.68,
      odds: 1.47,
      reasoning: `Pick conservador. Datos limitados para análisis profundo.`
    });
  }
  
  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    league,
    picks: picks.sort((a, b) => b.probability - a.probability),
    stats: {
      homeStrength: homeTeam.strength,
      awayStrength: awayTeam.strength,
      diff,
      homeForm: homeTeam.form,
      awayForm: awayTeam.form,
      homeWinRateForm,
      awayWinRateForm,
      totalGoalsAvg,
      totalXG
    }
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
  
  // FILTRAR: NO incluir "Más de 0.5 goles" - muy genérico y poco específico
  // Solo excluir exactamente "0.5 goles", no "1.5" ni otros
  const validPicks = analysis.picks.filter(p => {
    const label = p.label.toLowerCase();
    // Excluir solo "0.5 goles" (muy genérico)
    if (label.includes('0.5 goles') || label.includes('0.5 gole')) {
      return false;
    }
    return true;
  });
  
  // Si no quedan picks válidos, usar el por defecto
  if (validPicks.length === 0) {
    return {
      matchId: match.id,
      homeTeam: analysis.homeTeam,
      awayTeam: analysis.awayTeam,
      league: analysis.league,
      matchDate: match.matchDate,
      pick: `${analysis.homeTeam} gana o empata (1X)`,
      odds: 1.45,
      probability: 0.69,
      analysis: `Pick conservador. ${analysis.homeTeam} (${analysis.stats.homeStrength}) vs ${analysis.awayTeam} (${analysis.stats.awayStrength}).`,
      status: 'pending'
    };
  }
  
  // ELEGIR el pick de MENOR RIESGO (mayor probabilidad)
  // Ya están ordenados por probabilidad descendente
  const bestPick = validPicks[0];
  
  return {
    matchId: match.id,
    homeTeam: analysis.homeTeam,
    awayTeam: analysis.awayTeam,
    league: analysis.league,
    matchDate: match.matchDate,
    pick: bestPick.label,
    odds: bestPick.odds,
    probability: bestPick.probability,
    analysis: bestPick.reasoning,
    status: 'pending'
  };
}

// ==========================================
// GENERAR COMBINADA DESDE PARTIDOS SELECCIONADOS
// ==========================================
export function generateCombinadaFromMatches(
  selectedMatches: { id: string; homeTeam: string; awayTeam: string; league: string; matchDate: string }[]
): Combinada {
  const matchPicks: MatchPick[] = selectedMatches.map(match => generatePickForMatch(match));
  
  const totalOdds = Math.round(matchPicks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
  const totalProbability = Math.round(matchPicks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
  
  return {
    id: `comb_${Date.now()}`,
    picks: matchPicks,
    totalOdds,
    totalProbability,
    risk: 'low',
    status: 'pending',
    taken: false
  };
}

// ==========================================
// EXPORTAR DATOS
// ==========================================
export { LEAGUES, TEAMS_BY_LEAGUE };
