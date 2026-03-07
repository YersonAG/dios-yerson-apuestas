// API de Fútbol - El Dios Yerson
// 🌐 SCRAPER con Cheerio - Flashscore Móvil (HTML estático)
// GRATIS, SIN APIs, SIN LÍMITES

import * as cheerio from 'cheerio';

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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Cache de estadísticas
const teamStatsCache = new Map<number, { goalsFor: number; goalsAgainst: number; form: string; position: number }>();

console.log('⚽ Scraper: Flashscore Móvil (Cheerio)');

// ===== LIGAS QUE USAN CASAS DE APUESTAS LATAM =====
const ALLOWED_LEAGUES: { patterns: string[]; name: string; country: string }[] = [
  // LATAM
  { patterns: ['COLOMBIA', 'Categoria', 'Dimayor'], name: 'Liga BetPlay', country: 'Colombia' },
  { patterns: ['ARGENTINA'], name: 'Liga Argentina', country: 'Argentina' },
  { patterns: ['BRASIL', 'Brasileirao', 'Paulista', 'Mineiro', 'Carioca', 'Gaucho'], name: 'Brasileirão', country: 'Brasil' },
  { patterns: ['MEXICO', 'Liga MX'], name: 'Liga MX', country: 'México' },
  { patterns: ['CHILE'], name: 'Primera Chile', country: 'Chile' },
  { patterns: ['ECUADOR', 'Liga Pro'], name: 'Liga Pro Ecuador', country: 'Ecuador' },
  { patterns: ['PERU', 'Liga 1'], name: 'Liga 1 Perú', country: 'Perú' },
  { patterns: ['URUGUAY'], name: 'Primera Uruguay', country: 'Uruguay' },
  { patterns: ['PARAGUAY'], name: 'Primera Paraguay', country: 'Paraguay' },
  { patterns: ['VENEZUELA', 'FUTVE'], name: 'Primera Venezuela', country: 'Venezuela' },
  { patterns: ['BOLIVIA'], name: 'Liga Bolivia', country: 'Bolivia' },
  
  // Copas LATAM
  { patterns: ['Libertadores'], name: 'Copa Libertadores', country: 'Sudamérica' },
  { patterns: ['Sudamericana'], name: 'Copa Sudamericana', country: 'Sudamérica' },
  
  // Europa Top 5
  { patterns: ['INGLATERRA', 'Premier League'], name: 'Premier League', country: 'Inglaterra' },
  { patterns: ['ESPAÑA', 'LaLiga', 'La Liga'], name: 'La Liga', country: 'España' },
  { patterns: ['ITALIA', 'Serie A'], name: 'Serie A', country: 'Italia' },
  { patterns: ['ALEMANIA', 'Bundesliga'], name: 'Bundesliga', country: 'Alemania' },
  { patterns: ['FRANCIA', 'Ligue 1'], name: 'Ligue 1', country: 'Francia' },
  
  // Copas Europa
  { patterns: ['Champions League', 'Champions'], name: 'Champions League', country: 'Europa' },
  { patterns: ['Europa League'], name: 'Europa League', country: 'Europa' },
  { patterns: ['FA Cup'], name: 'FA Cup', country: 'Inglaterra' },
  
  // Otros populares
  { patterns: ['ESTADOS UNIDOS', 'MLS'], name: 'MLS', country: 'Estados Unidos' },
  { patterns: ['PAISES BAJOS', 'Eredivisie', 'HOLANDA'], name: 'Eredivisie', country: 'Holanda' },
  { patterns: ['PORTUGAL', 'Liga Portugal'], name: 'Primeira Liga', country: 'Portugal' },
  { patterns: ['TURQUIA', 'Super Lig'], name: 'Süper Lig', country: 'Turquía' },
  { patterns: ['BÉLGICA', 'Jupiler'], name: 'Jupiler Pro League', country: 'Bélgica' },
];

// ===== FUNCIÓN PARA MATCHear LIGA =====
function matchLeague(leagueText: string): { name: string; country: string } | null {
  const upper = leagueText.toUpperCase();
  
  for (const league of ALLOWED_LEAGUES) {
    for (const pattern of league.patterns) {
      if (upper.includes(pattern.toUpperCase())) {
        return { name: league.name, country: league.country };
      }
    }
  }
  
  return null;
}

// ===== FUNCIÓN PRINCIPAL =====
export async function getUpcomingMatches(days: number = 7): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    const now = new Date();
    return cachedMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime());
  }
  
  console.log('🌐 Obteniendo partidos de Flashscore Móvil...');
  const startTime = Date.now();
  
  const allMatches: MatchForApp[] = [];
  const seenIds = new Set<string>();
  
  // Headers para simular móvil
  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
  };
  
  // Obtener partidos de cada día
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    try {
      const url = `https://m.flashscore.es/?d=${dayOffset}`;
      
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      const html = await response.text();
      
      const $ = cheerio.load(html);
      
      // Fecha base para este día
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + dayOffset);
      const dateStr = baseDate.toISOString().split('T')[0];
      
      // Obtener el contenido del main
      const mainContent = $('#main').html() || '';
      
      // Separar por <h4> para identificar ligas
      const parts = mainContent.split(/<h4[^>]*>/i);
      
      let currentLeague: { name: string; country: string } | null = null;
      
      for (const part of parts) {
        // Verificar si esta parte comienza con un nombre de liga
        const h4End = part.indexOf('</h4>');
        
        if (h4End > 0) {
          // Es un título de liga
          const leagueHtml = part.substring(0, h4End);
          const leagueText = cheerio.load(leagueHtml).text().replace('Clasificación', '').trim();
          currentLeague = matchLeague(leagueText);
        }
        
        // Si tenemos una liga válida, buscar partidos en el resto
        if (currentLeague) {
          // Buscar partidos: <span>HORA</span>EQUIPO1 - EQUIPO2 <a>-:-</a>
          const matchPattern = /<span[^>]*>(\d{1,2}:\d{2})<\/span>([^<]+)\s*-\s*([^<]+?)\s*<a[^>]*class="sched"[^>]*>-:-<\/a>/gi;
          
          let match;
          while ((match = matchPattern.exec(part)) !== null) {
            const time = match[1];
            const homeTeam = match[2].trim();
            const awayTeam = match[3].trim();
            
            if (homeTeam && awayTeam && homeTeam.length > 1 && awayTeam.length > 1) {
              const matchId = `fs_${dateStr}_${homeTeam}_${awayTeam}`.replace(/\s+/g, '_').toLowerCase();
              
              if (!seenIds.has(matchId)) {
                seenIds.add(matchId);
                
                // Crear fecha completa
                const [hours, minutes] = time.split(':').map(Number);
                const matchDate = new Date(baseDate);
                matchDate.setHours(hours, minutes, 0, 0);
                
                allMatches.push({
                  id: matchId,
                  homeTeam,
                  awayTeam,
                  league: currentLeague.name,
                  country: currentLeague.country,
                  matchDate: matchDate.toISOString(),
                  status: 'Scheduled',
                });
              }
            }
          }
        }
      }
      
      console.log(`  ✅ Día +${dayOffset}: procesado`);
      
      // Pausa entre requests
      await new Promise(r => setTimeout(r, 300));
      
    } catch (error) {
      console.log(`  ❌ Error día +${dayOffset}`);
    }
  }
  
  // Ordenar por fecha
  allMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  
  // Filtrar partidos futuros
  const now = new Date();
  const filteredMatches = allMatches.filter(m => new Date(m.matchDate).getTime() > now.getTime());
  
  // Actualizar cache
  cachedMatches = filteredMatches;
  cacheTime = Date.now();
  
  const elapsed = Date.now() - startTime;
  console.log(`\n✅ TOTAL: ${filteredMatches.length} partidos en ${(elapsed/1000).toFixed(1)}s`);
  
  // Resumen por liga
  const byLeague = new Map<string, number>();
  for (const m of filteredMatches) {
    byLeague.set(m.league, (byLeague.get(m.league) || 0) + 1);
  }
  console.log('\n📊 Por liga:');
  for (const [league, count] of byLeague) {
    console.log(`  ${league}: ${count}`);
  }
  
  return filteredMatches;
}

// ===== OBTENER STATS =====
export function getTeamStats(teamId: number | undefined): { goalsFor: number; goalsAgainst: number; form: string; position: number } | null {
  if (!teamId) return null;
  return teamStatsCache.get(teamId) || null;
}

// ===== RESULTADOS =====
export async function getMatchResults(matchIds: string[]): Promise<MatchResult[]> {
  return [];
}

// ===== EVALUAR PICK =====
export function evaluatePickResult(pick: string, homeScore: number, awayScore: number): 'won' | 'lost' {
  const totalGoals = homeScore + awayScore;
  const normalizedPick = pick.toLowerCase().trim();
  
  if (normalizedPick.includes('1x') || normalizedPick.includes('gana o empata (1x)')) {
    return (homeScore >= awayScore) ? 'won' : 'lost';
  }
  if (normalizedPick.includes('x2') || normalizedPick.includes('gana o empata (x2)')) {
    return (awayScore >= homeScore) ? 'won' : 'lost';
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

export type { MatchForApp };
