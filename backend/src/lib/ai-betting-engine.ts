// Sistema de IA para Apuestas Deportivas - El Dios Yerson
// REGLA PRINCIPAL: SOLO APUESTAS DE BAJO RIESGO

// ==========================================
// DATOS DE EQUIPOS Y LIGAS
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
  "Premier League": [
    { name: "Manchester City", strength: 95, form: "WWWDW", goalsAvg: 2.7, goalsConceded: 0.9, xG: 2.5, homeWinRate: 0.85, awayWinRate: 0.75 },
    { name: "Arsenal", strength: 90, form: "WDWWW", goalsAvg: 2.4, goalsConceded: 1.0, xG: 2.2, homeWinRate: 0.82, awayWinRate: 0.70 },
    { name: "Liverpool", strength: 92, form: "WWDWW", goalsAvg: 2.5, goalsConceded: 1.1, xG: 2.3, homeWinRate: 0.80, awayWinRate: 0.72 },
    { name: "Manchester United", strength: 82, form: "WLWDL", goalsAvg: 1.8, goalsConceded: 1.3, xG: 1.7, homeWinRate: 0.65, awayWinRate: 0.50 },
    { name: "Chelsea", strength: 80, form: "WDWDL", goalsAvg: 1.7, goalsConceded: 1.2, xG: 1.6, homeWinRate: 0.62, awayWinRate: 0.48 },
    { name: "Tottenham", strength: 78, form: "LWWDL", goalsAvg: 1.9, goalsConceded: 1.4, xG: 1.8, homeWinRate: 0.60, awayWinRate: 0.45 },
    { name: "Newcastle", strength: 75, form: "WDWDW", goalsAvg: 1.6, goalsConceded: 1.0, xG: 1.5, homeWinRate: 0.70, awayWinRate: 0.42 },
    { name: "Aston Villa", strength: 72, form: "WWLWD", goalsAvg: 1.5, goalsConceded: 1.3, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.38 },
  ],
  "La Liga": [
    { name: "Real Madrid", strength: 94, form: "WWWWW", goalsAvg: 2.5, goalsConceded: 0.8, xG: 2.4, homeWinRate: 0.88, awayWinRate: 0.72 },
    { name: "Barcelona", strength: 91, form: "WDWWW", goalsAvg: 2.3, goalsConceded: 0.9, xG: 2.2, homeWinRate: 0.85, awayWinRate: 0.68 },
    { name: "Atlético Madrid", strength: 85, form: "WDWDW", goalsAvg: 1.8, goalsConceded: 0.7, xG: 1.7, homeWinRate: 0.75, awayWinRate: 0.55 },
    { name: "Real Sociedad", strength: 76, form: "WDLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.60, awayWinRate: 0.42 },
    { name: "Villarreal", strength: 74, form: "DLWWD", goalsAvg: 1.6, goalsConceded: 1.2, xG: 1.5, homeWinRate: 0.58, awayWinRate: 0.40 },
  ],
  "Serie A": [
    { name: "Inter Milan", strength: 90, form: "WDWWW", goalsAvg: 2.3, goalsConceded: 0.8, xG: 2.2, homeWinRate: 0.82, awayWinRate: 0.65 },
    { name: "Napoli", strength: 85, form: "WDWDW", goalsAvg: 2.1, goalsConceded: 0.9, xG: 2.0, homeWinRate: 0.78, awayWinRate: 0.58 },
    { name: "AC Milan", strength: 83, form: "WLWDW", goalsAvg: 1.9, goalsConceded: 1.0, xG: 1.8, homeWinRate: 0.72, awayWinRate: 0.52 },
    { name: "Juventus", strength: 82, form: "WDWDW", goalsAvg: 1.7, goalsConceded: 0.7, xG: 1.6, homeWinRate: 0.70, awayWinRate: 0.55 },
  ],
  "Bundesliga": [
    { name: "Bayern Munich", strength: 95, form: "WWWWW", goalsAvg: 3.0, goalsConceded: 0.8, xG: 2.8, homeWinRate: 0.90, awayWinRate: 0.75 },
    { name: "Borussia Dortmund", strength: 88, form: "WDWWW", goalsAvg: 2.4, goalsConceded: 1.2, xG: 2.3, homeWinRate: 0.78, awayWinRate: 0.58 },
    { name: "RB Leipzig", strength: 82, form: "WLWDW", goalsAvg: 2.0, goalsConceded: 1.1, xG: 1.9, homeWinRate: 0.70, awayWinRate: 0.52 },
  ],
  "Ligue 1": [
    { name: "PSG", strength: 96, form: "WWWWW", goalsAvg: 2.8, goalsConceded: 0.7, xG: 2.7, homeWinRate: 0.92, awayWinRate: 0.78 },
    { name: "Monaco", strength: 80, form: "WDWDL", goalsAvg: 1.9, goalsConceded: 1.2, xG: 1.8, homeWinRate: 0.65, awayWinRate: 0.48 },
    { name: "Marseille", strength: 78, form: "WLWDW", goalsAvg: 1.8, goalsConceded: 1.1, xG: 1.7, homeWinRate: 0.62, awayWinRate: 0.45 },
  ],
  "Liga BetPlay": [
    { name: "Atlético Nacional", strength: 85, form: "WDWDW", goalsAvg: 1.8, goalsConceded: 0.9, xG: 1.7, homeWinRate: 0.75, awayWinRate: 0.55 },
    { name: "Millonarios", strength: 82, form: "WLWDW", goalsAvg: 1.7, goalsConceded: 1.0, xG: 1.6, homeWinRate: 0.72, awayWinRate: 0.52 },
    { name: "América de Cali", strength: 78, form: "DWLWD", goalsAvg: 1.5, goalsConceded: 1.1, xG: 1.4, homeWinRate: 0.65, awayWinRate: 0.45 },
    { name: "Junior de Barranquilla", strength: 76, form: "WDLWL", goalsAvg: 1.4, goalsConceded: 1.2, xG: 1.3, homeWinRate: 0.62, awayWinRate: 0.42 },
    { name: "Independiente Santa Fe", strength: 72, form: "WDLWL", goalsAvg: 1.2, goalsConceded: 1.2, xG: 1.1, homeWinRate: 0.52, awayWinRate: 0.38 },
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
  matchDate: Date;
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
  matchDate: Date;
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
// CACHE DE PARTIDOS
// ==========================================
const matchesCache = new Map<string, AvailableMatch[]>();

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ==========================================
// GENERAR PARTIDOS DISPONIBLES
// ==========================================
export function generateAvailableMatches(numMatches: number, league?: string): AvailableMatch[] {
  const matches: AvailableMatch[] = [];
  const now = new Date();
  // Ajustar a hora de Colombia (UTC-5)
  const colombiaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  const usedTeams = new Set<string>();
  
  const leaguesToUse = league ? [league] : LEAGUES;
  
  for (let i = 0; i < numMatches; i++) {
    let attempts = 0;
    
    while (attempts < 50) {
      const selectedLeague = getRandomItem(leaguesToUse);
      const teams = TEAMS_BY_LEAGUE[selectedLeague];
      if (!teams) break;
      
      const home = getRandomItem(teams);
      let away = getRandomItem(teams);
      while (away.name === home.name) {
        away = getRandomItem(teams);
      }
      
      const teamKey = `${home.name}-${away.name}`;
      if (usedTeams.has(teamKey)) {
        attempts++;
        continue;
      }
      
      // Fecha en horario de Colombia
      const matchDate = new Date(colombiaTime);
      matchDate.setHours(matchDate.getHours() + (i * 6) + Math.floor(Math.random() * 24));
      matchDate.setMinutes([0, 15, 30, 45][Math.floor(Math.random() * 4)]);
      matchDate.setSeconds(0);
      
      matches.push({
        id: generateId(),
        homeTeam: home.name,
        awayTeam: away.name,
        league: selectedLeague,
        matchDate,
        homeStrength: home.strength,
        awayStrength: away.strength,
        homeForm: home.form,
        awayForm: away.form,
        homeGoalsAvg: home.goalsAvg,
        awayGoalsAvg: away.goalsAvg,
        homeXG: home.xG,
        awayXG: home.xG,
        homeWinRate: home.homeWinRate,
        awayWinRate: home.awayWinRate,
      });
      
      usedTeams.add(teamKey);
      break;
    }
  }
  
  return matches.sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());
}

// ==========================================
// ANÁLISIS DE BAJO RIESGO
// ==========================================
interface LowRiskPick {
  label: string;
  probability: number;
  odds: number;
  reasoning: string;
}

function analyzeLowRiskPicks(match: AvailableMatch): LowRiskPick[] {
  const picks: LowRiskPick[] = [];
  const diff = match.homeStrength - match.awayStrength;
  const homeWinRate = match.homeForm.split('').filter(c => c === 'W').length / 5;
  const awayWinRate = match.awayForm.split('').filter(c => c === 'W').length / 5;
  const totalGoalsAvg = match.homeGoalsAvg + match.awayGoalsAvg;
  const totalXG = match.homeXG + match.awayXG;
  
  // Doble oportunidad 1X (Local gana o empata)
  if (diff > 5 || match.homeWinRate > 0.5) {
    const prob = Math.min(0.85, 0.60 + (diff * 0.005) + (homeWinRate * 0.15));
    picks.push({
      label: `${match.homeTeam} gana o empata (1X)`,
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `${match.homeTeam} tiene ${Math.round(homeWinRate * 100)}% victorias en casa.`
    });
  }
  
  // Doble oportunidad X2 (Visitante gana o empata)
  if (diff < -5 || match.awayWinRate > 0.5) {
    const prob = Math.min(0.85, 0.60 + (Math.abs(diff) * 0.005) + (awayWinRate * 0.15));
    picks.push({
      label: `${match.awayTeam} gana o empata (X2)`,
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `${match.awayTeam} tiene ${Math.round(awayWinRate * 100)}% victorias como visitante.`
    });
  }
  
  // Over 1.5 goles
  if (totalGoalsAvg > 2.0 || totalXG > 2.0) {
    const prob = Math.min(0.90, 0.70 + (totalGoalsAvg - 2) * 0.08);
    picks.push({
      label: 'Más de 1.5 goles',
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `Promedio: ${totalGoalsAvg.toFixed(1)} goles.`
    });
  }
  
  // Under 4.5 goles
  if (totalGoalsAvg < 3.5) {
    const prob = Math.min(0.95, 0.80 + (3.5 - totalGoalsAvg) * 0.08);
    picks.push({
      label: 'Menos de 4.5 goles',
      probability: prob,
      odds: Math.round((1 / prob) * 100) / 100,
      reasoning: `Partido cerrado esperado.`
    });
  }
  
  // Si no hay picks, agregar uno por defecto
  if (picks.length === 0) {
    picks.push({
      label: `${match.homeTeam} gana o empata (1X)`,
      probability: 0.70,
      odds: 1.42,
      reasoning: `Pick conservador.`
    });
  }
  
  return picks.sort((a, b) => b.probability - a.probability);
}

// ==========================================
// GENERAR COMBINADA DESDE PARTIDOS
// ==========================================
export function generateCombinadaFromMatches(
  selectedMatches: AvailableMatch[],
  numPicks: number
): Combinada {
  const allPicks: { match: AvailableMatch; pick: LowRiskPick }[] = [];
  
  for (const match of selectedMatches) {
    // Convertir fecha si viene como string
    const normalizedMatch = {
      ...match,
      matchDate: typeof match.matchDate === 'string' ? new Date(match.matchDate) : match.matchDate
    };
    
    const lowRiskPicks = analyzeLowRiskPicks(normalizedMatch);
    if (lowRiskPicks.length > 0) {
      allPicks.push({ match: normalizedMatch, pick: lowRiskPicks[0] });
    }
  }
  
  const selectedPicks = allPicks
    .sort((a, b) => b.pick.probability - a.pick.probability)
    .slice(0, Math.min(numPicks, 20));
  
  const matchPicks: MatchPick[] = selectedPicks.map(({ match, pick }) => ({
    matchId: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    matchDate: match.matchDate,
    pick: pick.label,
    odds: pick.odds,
    probability: pick.probability,
    analysis: pick.reasoning,
    status: 'pending' as const,
  }));
  
  const totalOdds = Math.round(matchPicks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
  const totalProbability = Math.round(matchPicks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
  
  return {
    id: generateId(),
    picks: matchPicks,
    totalOdds,
    totalProbability,
    risk: 'low',
    status: 'pending',
    taken: false,
  };
}

// ==========================================
// PROCESAMIENTO PRINCIPAL
// ==========================================
export async function processWithAI(
  userMessage: string,
  username?: string,
  userId?: string,
  selectedMatchIds?: string[]
): Promise<{
  message: string;
  combinadas?: Combinada[];
  type: string;
  availableMatches?: AvailableMatch[];
}> {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  // ========== SI HAY PARTIDOS SELECCIONADOS ==========
  if (selectedMatchIds && selectedMatchIds.length > 0 && userId) {
    const cachedMatches = matchesCache.get(userId) || [];
    const selectedMatches = cachedMatches.filter(m => selectedMatchIds.includes(m.id));
    
    if (selectedMatches.length > 0) {
      const combinada = generateCombinadaFromMatches(selectedMatches, selectedMatches.length);
      
      // Formatear fecha en horario Colombia
      const formatDate = (d: Date) => {
        return d.toLocaleDateString('es-CO', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Bogota'
        });
      };
      
      let response = `🎰 **COMBINADA GENERADA**\n\n`;
      response += `Con los ${selectedMatches.length} partidos que seleccionaste:\n\n`;
      response += `📊 **Probabilidad:** ${(combinada.totalProbability * 100).toFixed(0)}%\n`;
      response += `💰 **Cuota:** ${combinada.totalOdds.toFixed(2)}\n\n`;
      response += `---\n`;
      
      combinada.picks.forEach((pick, i) => {
        response += `\n**${i + 1}. ${pick.homeTeam} vs ${pick.awayTeam}**\n`;
        response += `📅 ${formatDate(pick.matchDate)} | 📍 ${pick.league}\n`;
        response += `✅ **${pick.pick}**\n`;
        response += `💰 ${pick.odds.toFixed(2)} | ${(pick.probability * 100).toFixed(0)}%\n\n`;
      });
      
      response += `---\n\n`;
      response += `🟢 **BAJO RIESGO**\n\n`;
      response += `*Agradece al Dios Yerson.* 🙏`;
      
      // Limpiar cache
      matchesCache.delete(userId);
      
      return { message: response, combinadas: [combinada], type: 'combinadas' };
    }
  }
  
  // ========== VER PARTIDOS ==========
  if (lowerMessage.includes('ver partido') || lowerMessage.includes('partidos disponible') || 
      lowerMessage.includes('quiero ver') || lowerMessage.includes('mostrar') ||
      lowerMessage.includes('lista') || lowerMessage.includes('partidos')) {
    
    const numMatch = lowerMessage.match(/(\d+)/);
    const numMatches = numMatch ? Math.min(parseInt(numMatch[1]), 20) : 10;
    
    const matches = generateAvailableMatches(numMatches);
    
    // Guardar en cache
    if (userId) {
      matchesCache.set(userId, matches);
    }
    
    let response = `📋 **PARTIDOS DISPONIBLES**\n\n`;
    response += `Selecciona los partidos en la lista de abajo:\n\n`;
    
    return { message: response, type: 'showing_matches', availableMatches: matches };
  }
  
  // ========== GENERAR AUTOMÁTICAMENTE ==========
  if (lowerMessage.includes('automátic') || lowerMessage.includes('automatico') || lowerMessage.includes('auto')) {
    const numMatch = lowerMessage.match(/(\d+)/);
    const numPicks = numMatch ? Math.min(parseInt(numMatch[1]), 20) : 5;
    
    const matches = generateAvailableMatches(numPicks + 2);
    const combinada = generateCombinadaFromMatches(matches, numPicks);
    
    const formatDate = (d: Date) => {
      return d.toLocaleDateString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota'
      });
    };
    
    let response = `🎰 **COMBINADA AUTOMÁTICA**\n\n`;
    response += `📊 **Probabilidad:** ${(combinada.totalProbability * 100).toFixed(0)}%\n`;
    response += `💰 **Cuota:** ${combinada.totalOdds.toFixed(2)}\n\n`;
    response += `---\n`;
    
    combinada.picks.forEach((pick, i) => {
      response += `\n**${i + 1}. ${pick.homeTeam} vs ${pick.awayTeam}**\n`;
      response += `📅 ${formatDate(pick.matchDate)} | 📍 ${pick.league}\n`;
      response += `✅ **${pick.pick}**\n`;
      response += `💰 ${pick.odds.toFixed(2)} | ${(pick.probability * 100).toFixed(0)}%\n\n`;
    });
    
    response += `---\n\n`;
    response += `🟢 **BAJO RIESGO**\n\n`;
    response += `*Agradece al Dios Yerson.* 🙏`;
    
    return { message: response, combinadas: [combinada], type: 'combinadas' };
  }
  
  // ========== SALUDO ==========
  if (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('hey')) {
    return {
      message: `${username || 'Mi socio'}, hola mi ludopana favorito, ya vienes a gastar plata en apuestas como buen pobre. ¿Que pensaste? ¿Te voy a sacar de pobre? jajaja pobrecito este care mondá, mejor dime ¿en que partidos le vas a encomendar tu dinero al El Dios Yerson?

Recuerda agradecerle siempre al El Dios Yerson por cada combinada 🙏

💡 Escribe **"ver partidos"** para ver los partidos disponibles.`,
      type: 'greeting'
    };
  }
  
  // ========== AYUDA ==========
  if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
    return {
      message: `📖 **CÓMO FUNCIONA**

**1️⃣ Escribe "ver partidos"**
   Te muestro los partidos con fecha y hora de Colombia

**2️⃣ Selecciona los partidos**
   Haz clic en los que quieras incluir

**3️⃣ Confirma tu selección**
   Yo genero los picks más seguros

**4️⃣ Toma la apuesta**
   Se guarda en "Activas"

---
💡 **MODO AUTOMÁTICO:** Escribe **"generar automáticamente"**

🟢 **Solo apuestas de BAJO RIESGO**`,
      type: 'help'
    };
  }
  
  // ========== POR DEFECTO ==========
  return {
    message: `No entendí, mi socio. 🤔

¿Quieres ver los partidos?
• Escribe **"ver partidos"**
• O di **"generar automáticamente"**

*Agradece al Dios Yerson.* 🙏`,
    type: 'unknown'
  };
}

export { LEAGUES, TEAMS_BY_LEAGUE };
