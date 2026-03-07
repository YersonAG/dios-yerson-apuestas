// API de Fútbol - El Dios Yerson
// 🚀 SCRAPER con Playwright + Cheerio
// Fuente: Flashscore.com (HTML renderizado con JavaScript)

import { chromium, Browser } from 'playwright';
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

// ===== BROWSER SINGLETON =====
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    console.log('🌐 Iniciando navegador Playwright...');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });
  }
  return browserInstance;
}

// Cerrar browser al terminar el proceso
process.on('SIGINT', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit();
});

console.log('⚽ Scraper: Playwright + Cheerio → Flashscore.com');

// ===== LIGAS PRINCIPALES (solo las que usan casas de apuestas LATAM) =====
// Solo aceptar estas ligas específicas
const ALLOWED_LEAGUES = [
  // === LATAM ===
  'liga betplay', 'primera a', 'categoria', 'colombia',
  'liga profesional', 'argentina', 'boca', 'river', 'racing', 'independiente',
  'brasileirão', 'brasileirao', 'serie a brazil', 'brazil serie',
  'liga mx', 'mexico', 'méxico', 'liga bbva mx',
  'primera chile', 'chile', 'colocolo', 'u. catolica', 'universidad',
  'liga pro ecuador', 'ecuador', 'ldu', 'barcelona sc', 'emelec',
  'liga 1 peru', 'peru', 'perú', 'alianza', 'universitario',
  // === Copas LATAM ===
  'copa libertadores', 'libertadores', 'conmebol',
  'copa sudamericana', 'sudamericana',
  // === Europa Top 5 ===
  'premier league', 'england', 'inglaterra', 'manchester', 'liverpool', 'chelsea', 'arsenal', 'tottenham',
  'la liga', 'laliga', 'spain', 'españa', 'barcelona', 'real madrid', 'atletico', 'sevilla', 'valencia',
  'serie a', 'italy', 'italia', 'juventus', 'milan', 'inter', 'napoli', 'roma', 'lazio',
  'bundesliga', 'germany', 'alemania', 'bayern', 'dortmund', 'leipzig', 'leverkusen',
  'ligue 1', 'france', 'francia', 'psg', 'marseille', 'lyon',
  // === Copas Europa ===
  'champions league', 'ucl', 'champions',
  'europa league', 'uel', 'europa',
  'conference league',
  'fa cup', 'copa del rey', 'coppa italia', 'dfb pokal', 'coupe de france',
  // === Otros populares en LATAM ===
  'mls', 'major league soccer', 'inter miami', 'la galaxy',
  'eredivisie', 'netherlands', 'holanda', 'ajax', 'psv', 'feyenoord',
  'primeira liga', 'portugal', 'benfica', 'porto', 'sporting',
];

// Función para verificar si una liga está permitida
function isAllowedLeague(leagueText: string): boolean {
  const text = leagueText.toLowerCase();
  
  // Rechazar ligas menores
  const REJECT = ['u19', 'u18', 'u20', 'u17', 'women', 'w ', ' w', 'reserves', 'b team', 
                  'youth', 'primavera', 'swazi', 'benin', 'fiji', 'vanuatu'];
  if (REJECT.some(r => text.includes(r))) return false;
  
  // Verificar ligas permitidas
  return ALLOWED_LEAGUES.some(l => text.includes(l));
}

// Función para extraer país y liga del header
function parseLeagueHeader(headerText: string): { league: string; country: string } {
  // Formato típico: "Ligue 1FRANCE: Standings" o "BundesligaGERMANY:"
  const text = headerText.replace(/Standings|Live|display matches/gi, '').trim();
  
  // Buscar país en mayúsculas
  const countryMatch = text.match(/[A-Z]{2,}(?::|$|\s)/);
  let country = countryMatch ? countryMatch[0].replace(':', '').trim() : '';
  
  // Mapear países
  const countryMap: Record<string, string> = {
    'FRANCE': 'Francia', 'GERMANY': 'Alemania', 'ITALY': 'Italia',
    'SPAIN': 'España', 'ENGLAND': 'Inglaterra', 'NETHERLANDS': 'Holanda',
    'PORTUGAL': 'Portugal', 'BELGIUM': 'Bélgica', 'BRAZIL': 'Brasil',
    'ARGENTINA': 'Argentina', 'COLOMBIA': 'Colombia', 'MEXICO': 'México',
    'CHILE': 'Chile', 'ECUADOR': 'Ecuador', 'PERU': 'Perú', 'URUGUAY': 'Uruguay',
    'PARAGUAY': 'Paraguay', 'VENEZUELA': 'Venezuela', 'BOLIVIA': 'Bolivia',
    'ASIA': 'Asia', 'USA': 'Estados Unidos', 'AUSTRALIA': 'Australia',
    'TURKEY': 'Turquía', 'GREECE': 'Grecia', 'RUSSIA': 'Rusia',
  };
  
  country = countryMap[country] || country;
  
  // Liga es el resto del texto
  let league = text.replace(/[A-Z]{2,}(?::|$|\s)/g, '').trim();
  
  return { league: league || headerText.substring(0, 30), country };
}

// ===== FUNCIÓN PRINCIPAL DE SCRAPING =====
async function scrapeFlashscore(): Promise<MatchForApp[]> {
  const browser = await getBrowser();
  const matches: MatchForApp[] = [];
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    console.log('  📡 Navegando a Flashscore...');
    await page.goto('https://www.flashscore.com/', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });
    
    // Esperar a que carguen los partidos
    await page.waitForSelector('.event__match', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    // Expandir ligas colapsadas
    const moreButtons = await page.$$('.event__more');
    if (moreButtons.length > 0) {
      console.log(`  📂 Expandiendo ${moreButtons.length} ligas...`);
      for (const button of moreButtons.slice(0, 30)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(150);
      }
    }
    
    const html = await page.content();
    await context.close();
    
    console.log(`  📄 HTML: ${(html.length / 1024).toFixed(0)}KB`);
    
    // Parsear con Cheerio
    const $ = cheerio.load(html);
    
    let currentLeague = '';
    let currentCountry = '';
    const today = new Date().toISOString().split('T')[0];
    
    // Iterar sobre todos los elementos en orden
    $('.sportName.soccer > div').each((_, el) => {
      const element = $(el);
      const classAttr = element.attr('class') || '';
      
      // Si es un header de liga/torneo
      if (classAttr.includes('event__header') || classAttr.includes('header')) {
        const headerText = element.text().trim();
        if (headerText && !headerText.includes('Standings')) {
          const parsed = parseLeagueHeader(headerText);
          currentLeague = parsed.league;
          currentCountry = parsed.country;
        }
        return;
      }
      
      // Si es un partido
      if (classAttr.includes('event__match')) {
        // Verificar que la liga esté permitida
        const leagueText = `${currentLeague} ${currentCountry}`;
        if (!isAllowedLeague(leagueText)) {
          return;
        }
        
        // Extraer equipos - buscar en elementos con participant
        const homeEl = element.find('[class*="homeParticipant"], .event__homeParticipant');
        const awayEl = element.find('[class*="awayParticipant"], .event__awayParticipant');
        
        const homeTeam = homeEl.find('span').last().text().trim() || homeEl.text().trim();
        const awayTeam = awayEl.find('span').last().text().trim() || awayEl.text().trim();
        
        // Extraer logos
        const homeLogo = homeEl.find('img').attr('src') || '';
        const awayLogo = awayEl.find('img').attr('src') || '';
        
        // Extraer hora/estado
        const timeText = element.find('.event__time').text().trim();
        const stageText = element.find('.event__stage').text().trim();
        
        // Determinar estado
        let status = 'Scheduled';
        if (stageText.toLowerCase().includes('finished') || stageText.includes('FT')) {
          status = 'FT';
        } else if (stageText.includes("'") || stageText.toLowerCase().includes('live')) {
          status = 'LIVE';
        } else if (timeText) {
          status = timeText;
        }
        
        // Crear fecha
        let matchDate = today;
        if (timeText && timeText.includes(':')) {
          matchDate = `${today}T${timeText}:00`;
        }
        
        // ID único
        const matchId = `fs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (homeTeam && awayTeam && homeTeam.length > 1 && awayTeam.length > 1) {
          matches.push({
            id: matchId,
            homeTeam,
            awayTeam,
            league: currentLeague || 'Liga',
            country: currentCountry || 'Internacional',
            matchDate,
            status,
            homeLogo,
            awayLogo,
          });
        }
      }
    });
    
    console.log(`    ✅ ${matches.length} partidos de ligas permitidas`);
    
  } catch (error) {
    console.error(`    ❌ Error:`, error);
  }
  
  return matches;
}

// ===== FUNCIÓN PRINCIPAL EXPORTADA =====
export async function getUpcomingMatches(days: number = 7): Promise<MatchForApp[]> {
  // Verificar cache
  if (cachedMatches.length > 0 && Date.now() - cacheTime < CACHE_DURATION) {
    console.log('📦 Usando cache:', cachedMatches.length, 'partidos');
    return cachedMatches;
  }
  
  console.log('🌐 Obteniendo partidos con Playwright...');
  const startTime = Date.now();
  
  const allMatches: MatchForApp[] = [];
  
  try {
    const matches = await scrapeFlashscore();
    allMatches.push(...matches);
  } catch (error) {
    console.error('❌ Error general:', error);
  }
  
  // Ordenar por fecha
  allMatches.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  
  // Actualizar cache
  cachedMatches = allMatches;
  cacheTime = Date.now();
  
  const elapsed = Date.now() - startTime;
  console.log(`\n✅ TOTAL: ${allMatches.length} partidos en ${(elapsed/1000).toFixed(1)}s`);
  
  return allMatches;
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
