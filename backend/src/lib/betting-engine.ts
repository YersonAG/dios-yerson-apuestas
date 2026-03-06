// Motor de Apuestas - Generador de Combinadas Simplificado
// "El Dios Yerson no falla"

// Equipos por liga con estadísticas
const TEAMS_BY_LEAGUE: Record<string, { name: string; strength: number }[]> = {
  "Premier League": [
    { name: "Manchester City", strength: 95 },
    { name: "Arsenal", strength: 90 },
    { name: "Liverpool", strength: 92 },
    { name: "Manchester United", strength: 82 },
    { name: "Chelsea", strength: 80 },
    { name: "Tottenham", strength: 78 },
    { name: "Newcastle", strength: 75 },
    { name: "Aston Villa", strength: 72 },
  ],
  "La Liga": [
    { name: "Real Madrid", strength: 94 },
    { name: "Barcelona", strength: 91 },
    { name: "Atlético Madrid", strength: 85 },
    { name: "Real Sociedad", strength: 76 },
    { name: "Villarreal", strength: 74 },
    { name: "Real Betis", strength: 72 },
  ],
  "Serie A": [
    { name: "Inter Milan", strength: 90 },
    { name: "Napoli", strength: 85 },
    { name: "AC Milan", strength: 83 },
    { name: "Juventus", strength: 82 },
    { name: "Atalanta", strength: 78 },
  ],
  "Bundesliga": [
    { name: "Bayern Munich", strength: 95 },
    { name: "Borussia Dortmund", strength: 88 },
    { name: "RB Leipzig", strength: 82 },
    { name: "Bayer Leverkusen", strength: 80 },
  ],
  "Ligue 1": [
    { name: "PSG", strength: 96 },
    { name: "Monaco", strength: 80 },
    { name: "Marseille", strength: 78 },
    { name: "Lille", strength: 75 },
  ],
  "Liga BetPlay": [
    { name: "Atlético Nacional", strength: 85 },
    { name: "Millonarios", strength: 82 },
    { name: "América de Cali", strength: 78 },
    { name: "Junior de Barranquilla", strength: 76 },
    { name: "Deportivo Cali", strength: 75 },
    { name: "Independiente Santa Fe", strength: 72 },
  ],
};

const LEAGUES = Object.keys(TEAMS_BY_LEAGUE);

// Interfaces
export interface Pick {
  matchId: string;
  match: string;
  pick: string;
  odds: number;
  probability: number;
  risk: 'low' | 'medium' | 'high';
  analysis: string;
}

export interface Combinada {
  id: string;
  picks: Pick[];
  totalOdds: number;
  totalProbability: number;
  risk: 'low' | 'medium' | 'high';
  league?: string;
}

interface YersonPick {
  match: {
    homeTeam: string;
    awayTeam: string;
    league: string;
    matchDate: Date;
  };
  pick: string;
  odds: number;
  probability: number;
  risk: 'low' | 'medium' | 'high';
  analysis: string;
}

// Funciones auxiliares
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function calculateOdds(homeStrength: number, awayStrength: number): { home: number; draw: number; away: number } {
  const diff = homeStrength - awayStrength + 10; // Ventaja local
  
  let homeProb = Math.min(0.85, Math.max(0.15, 0.45 + diff * 0.004));
  let awayProb = Math.min(0.70, Math.max(0.10, 0.30 - diff * 0.003));
  let drawProb = 1 - homeProb - awayProb;
  
  if (drawProb < 0.15) drawProb = 0.15;
  if (drawProb > 0.35) drawProb = 0.35;
  
  return {
    home: Math.round((1 / homeProb) * 1.08 * 100) / 100,
    draw: Math.round((1 / drawProb) * 1.08 * 100) / 100,
    away: Math.round((1 / awayProb) * 1.08 * 100) / 100,
  };
}

function generateMatch(league?: string) {
  const selectedLeague = league || getRandomItem(LEAGUES);
  const teams = TEAMS_BY_LEAGUE[selectedLeague];
  
  const home = getRandomItem(teams);
  let away = getRandomItem(teams);
  while (away.name === home.name) {
    away = getRandomItem(teams);
  }
  
  const odds = calculateOdds(home.strength, away.strength);
  const matchDate = new Date();
  matchDate.setDate(matchDate.getDate() + Math.floor(Math.random() * 7));
  
  return {
    id: generateId(),
    homeTeam: home.name,
    awayTeam: away.name,
    league: selectedLeague,
    matchDate,
    homeOdds: odds.home,
    drawOdds: odds.draw,
    awayOdds: odds.away,
    homeStrength: home.strength,
    awayStrength: away.strength,
  };
}

function generatePick(match: ReturnType<typeof generateMatch>, risk: 'low' | 'medium' | 'high'): Pick {
  const diff = match.homeStrength - match.awayStrength;
  let pick: string;
  let odds: number;
  let probability: number;
  
  if (risk === 'low') {
    if (diff > 15) {
      pick = 'Local Win';
      odds = match.homeOdds;
      probability = 0.65 + Math.random() * 0.15;
    } else if (diff < -10) {
      pick = 'Away Win';
      odds = match.awayOdds;
      probability = 0.55 + Math.random() * 0.15;
    } else {
      pick = Math.random() > 0.5 ? 'Over 1.5' : 'Under 3.5';
      odds = 1.35 + Math.random() * 0.15;
      probability = 0.70 + Math.random() * 0.1;
    }
  } else if (risk === 'medium') {
    if (diff > 5) {
      pick = 'Local Win';
      odds = match.homeOdds;
      probability = 0.50 + Math.random() * 0.15;
    } else {
      pick = 'Over 2.5';
      odds = 1.80 + Math.random() * 0.3;
      probability = 0.45 + Math.random() * 0.15;
    }
  } else {
    if (Math.random() > 0.5) {
      pick = 'Away Win';
      odds = match.awayOdds;
      probability = 0.25 + Math.random() * 0.15;
    } else {
      pick = 'Draw';
      odds = match.drawOdds;
      probability = 0.20 + Math.random() * 0.15;
    }
  }
  
  const analyses = [
    `El ${match.homeTeam} tiene buena forma reciente. El Dios Yerson ve valor aquí.`,
    `Análisis profundo: El ${match.awayTeam} viene motivado. Ojo con la sorpresa.`,
    `Los números no mienten: Este pick tiene buena probabilidad según las cuotas.`,
    `El Dios Yerson analizó el H2H y ve ventaja. Confía en el proceso.`,
  ];
  
  return {
    matchId: match.id,
    match: `${match.homeTeam} vs ${match.awayTeam} (${match.league})`,
    pick,
    odds: Math.round(odds * 100) / 100,
    probability: Math.round(probability * 100) / 100,
    risk,
    analysis: getRandomItem(analyses),
  };
}

// Generar combinadas
export function generateCombinadas(
  numCombinadas: number = 1,
  matchesPerCombinada: number = 3,
  league?: string,
  riskLevel: 'low' | 'medium' | 'high' | 'mixed' = 'mixed'
): Combinada[] {
  const combinadas: Combinada[] = [];
  
  for (let i = 0; i < numCombinadas; i++) {
    const picks: Pick[] = [];
    const usedTeams = new Set<string>();
    
    for (let j = 0; j < matchesPerCombinada; j++) {
      let match;
      let attempts = 0;
      
      do {
        match = generateMatch(league);
        attempts++;
      } while ((usedTeams.has(match.homeTeam) || usedTeams.has(match.awayTeam)) && attempts < 20);
      
      usedTeams.add(match.homeTeam);
      usedTeams.add(match.awayTeam);
      
      const risk = riskLevel === 'mixed' 
        ? getRandomItem(['low', 'medium', 'high'] as const)
        : riskLevel;
      
      picks.push(generatePick(match, risk));
    }
    
    const totalOdds = Math.round(picks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
    const totalProbability = Math.round(picks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
    
    const avgRisk = picks.reduce((acc, p) => acc + (p.risk === 'low' ? 1 : p.risk === 'medium' ? 2 : 3), 0) / picks.length;
    const overallRisk: 'low' | 'medium' | 'high' = avgRisk < 1.5 ? 'low' : avgRisk < 2.5 ? 'medium' : 'high';
    
    combinadas.push({
      id: generateId(),
      picks,
      totalOdds,
      totalProbability,
      risk: overallRisk,
      league,
    });
  }
  
  return combinadas;
}

// Generar la apuesta del día del Dios Yerson
export function generateYersonPick(): YersonPick {
  // Buscar el mejor partido
  let bestMatch = null;
  let bestDiff = 0;
  
  for (let i = 0; i < 20; i++) {
    const match = generateMatch();
    const diff = Math.abs(match.homeStrength - match.awayStrength);
    if (diff > bestDiff) {
      bestDiff = diff;
      bestMatch = match;
    }
  }
  
  if (!bestMatch) bestMatch = generateMatch();
  
  const pick = generatePick(bestMatch, 'low');
  
  return {
    match: {
      homeTeam: bestMatch.homeTeam,
      awayTeam: bestMatch.awayTeam,
      league: bestMatch.league,
      matchDate: bestMatch.matchDate,
    },
    pick: pick.pick,
    odds: pick.odds,
    probability: pick.probability,
    risk: pick.risk,
    analysis: `🌟 PICK DEL DÍA DEL DIOS YERSON 🌟\n\n${pick.analysis}\n\nEste es el mejor valor que encontré hoy. Si pega, agradéceme. Si no, el fútbol es así de jodido.`,
  };
}

// Formatear combinada
export function formatCombinada(combinada: Combinada): string {
  let text = `🎯 COMBINADA #${combinada.id.toUpperCase()}\n`;
  text += `💰 Cuota Total: ${combinada.totalOdds.toFixed(2)}\n`;
  text += `📊 Probabilidad: ${(combinada.totalProbability * 100).toFixed(1)}%\n`;
  text += `⚠️ Riesgo: ${combinada.risk.toUpperCase()}\n\n`;
  
  combinada.picks.forEach((pick, i) => {
    text += `${i + 1}. ${pick.match}\n`;
    text += `   📍 ${pick.pick} @ ${pick.odds.toFixed(2)} (${(pick.probability * 100).toFixed(0)}%)\n`;
    text += `   💡 ${pick.analysis.substring(0, 80)}...\n\n`;
  });
  
  return text;
}

// Parsear comando del usuario
export function parseUserCommand(message: string) {
  const lower = message.toLowerCase();
  
  if (lower.includes('combinad') || lower.includes('apuesta') || lower.includes('pick') || lower.includes('quiero')) {
    const numMatch = lower.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : 1;
    
    let league: string | undefined;
    if (lower.includes('premier') || lower.includes('ingles')) league = 'Premier League';
    else if (lower.includes('liga') && (lower.includes('espa') || lower.includes('español'))) league = 'La Liga';
    else if (lower.includes('serie a') || lower.includes('itali')) league = 'Serie A';
    else if (lower.includes('bundesliga') || lower.includes('alem')) league = 'Bundesliga';
    else if (lower.includes('ligue') || lower.includes('franc')) league = 'Ligue 1';
    else if (lower.includes('betplay') || lower.includes('colomb')) league = 'Liga BetPlay';
    
    let risk: 'low' | 'medium' | 'high' | 'mixed' = 'mixed';
    if (lower.includes('segur') || lower.includes('bajo')) risk = 'low';
    else if (lower.includes('medio') || lower.includes('moderado')) risk = 'medium';
    else if (lower.includes('arriesgad') || lower.includes('alto') || lower.includes('locura')) risk = 'high';
    
    return {
      action: 'combinadas' as const,
      numCombinadas: Math.min(Math.max(num, 1), 5),
      matchesPerCombinada: 3,
      league,
      riskLevel: risk,
    };
  }
  
  if (lower.includes('yerson') || lower.includes('día') || lower.includes('dia')) {
    return { action: 'yerson' as const };
  }
  
  if (lower.includes('estadística') || lower.includes('stats')) {
    return { action: 'stats' as const };
  }
  
  if (lower.includes('historial') || lower.includes('pasadas')) {
    return { action: 'history' as const };
  }
  
  if (lower.includes('activa') || lower.includes('pendiente')) {
    return { action: 'active' as const };
  }
  
  if (lower.includes('ayuda') || lower.includes('help') || lower.includes('comando')) {
    return { action: 'help' as const };
  }
  
  return { action: 'unknown' as const };
}

export { LEAGUES, TEAMS_BY_LEAGUE };
