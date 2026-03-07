// Rutas de Chat - El Dios Yerson
// Motor v4.7 PRO - Monte Carlo + ELO + xG + Value Betting

import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';
import { getUpcomingMatches, MatchForApp } from '../lib/football-api';
import { analyzeMatch, generateCombinadaFromMatches, MatchPick, Combinada } from '../lib/ai-betting-engine';

const router = Router();

// ===== FILTRAR PARTIDOS QUE AÚN NO HAN COMENZADO =====
function filterFutureMatches(matches: MatchForApp[]): MatchForApp[] {
  const now = new Date();
  return matches.filter(m => {
    const matchDate = new Date(m.matchDate);
    return matchDate.getTime() > now.getTime() + 30 * 60 * 1000;
  });
}

// ===== FORMATEAR RESPUESTA CON MÉTRICAS v4.7 PRO =====
function formatCombinadaResponse(combinada: Combinada, title: string): string {
  let response = `🎰 **${title}**\n\n`;
  response += `📊 **Score: ${combinada.score}/100**\n`;
  response += `🎲 Probabilidad: **${(combinada.totalProbability * 100).toFixed(0)}%**\n`;
  response += `💰 Cuota total: **${combinada.totalOdds.toFixed(2)}**\n`;
  response += `📍 ${combinada.picks.length} picks\n\n`;
  response += `---\n\n`;
  
  combinada.picks.forEach((pick, i) => {
    const date = new Date(pick.matchDate);
    const dateStr = date.toLocaleDateString('es-CO', { 
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Bogota'
    });
    
    response += `**${i + 1}. ${pick.homeTeam} vs ${pick.awayTeam}**\n`;
    response += `📍 ${pick.league} | 📅 ${dateStr}\n`;
    response += `✅ **${pick.pick}** @ ${pick.odds.toFixed(2)}\n`;
    response += `📊 Score: **${pick.score}/100** | Monte Carlo: ${Math.round(pick.monteCarloProb * 100)}%\n`;
    response += `⚽ xG: ${pick.xGTotal.toFixed(2)} | ELO Diff: ${pick.eloDiff > 0 ? '+' : ''}${pick.eloDiff}\n`;
    response += `📉 Volatilidad: ${pick.volatility.toFixed(0)}/100`;
    if (pick.valueBet > 0) {
      response += ` | 💰 VALUE: +${pick.valueBet.toFixed(1)}%`;
    }
    response += `\n\n`;
  });
  
  response += `---\n\n🟢 **BAJO RIESGO** (Score > 65)\n\n*Agradece al Dios Yerson.* 🙏`;
  return response;
}

// ===== ENDPOINT GET (para probar) =====
router.get('/', async (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    message: 'Motor v4.7 PRO - Monte Carlo + ELO + xG + Value Betting',
    hint: 'POST {"message": "ver partidos"}',
    version: '4.7.0',
    features: ['Monte Carlo 10K', 'ELO Rating', 'xG Analysis', 'Value Betting', 'Volatility Score']
  });
});

// ===== ENDPOINT PRINCIPAL POST =====
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, selectedMatches: selectedMatchesData } = req.body;
    
    console.log('📩 Chat recibido:', message?.substring(0, 50));
    
    if (!message) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    const user = await getCurrentUser(req.headers.authorization);
    const lowerMessage = message.toLowerCase().trim();

    // ========== VER PARTIDOS ==========
    if (lowerMessage.includes('ver partido') || 
        lowerMessage.includes('partidos disponible') ||
        lowerMessage.includes('partidos') ||
        lowerMessage.includes('ver') ||
        lowerMessage.includes('lista')) {
      
      console.log('📋 Obteniendo partidos...');
      
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);
      
      console.log(`✅ Enviando ${matches.length} partidos FUTUROS`);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayMatches = matches.filter(m => {
        const d = new Date(m.matchDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }).length;
      
      const tomorrowMatches = matches.filter(m => {
        const d = new Date(m.matchDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === tomorrow.getTime();
      }).length;
      
      let dateInfo = '';
      if (todayMatches > 0) dateInfo += `📊 **Hoy:** ${todayMatches} partidos\n`;
      if (tomorrowMatches > 0) dateInfo += `📊 **Mañana:** ${tomorrowMatches} partidos\n`;
      
      return res.json({
        success: true,
        type: 'showing_matches',
        message: `📋 **PARTIDOS DISPONIBLES**\n\n${dateInfo}🗓️ Total: ${matches.length} partidos próximos\n\n⏰ Horario Colombia (UTC-5)\n\n⚠️ Máximo 20 partidos para generar picks\n\nSelecciona los partidos para tu combinada:`,
        availableMatches: matches,
      });
    }

    // ========== GENERAR COMBINADA CON PARTIDOS SELECCIONADOS ==========
    if (selectedMatchesData && Array.isArray(selectedMatchesData) && selectedMatchesData.length > 0) {
      console.log(`🎯 Generando combinada con ${selectedMatchesData.length} partidos SELECCIONADOS`);
      
      const matchesToUse = selectedMatchesData.slice(0, 20).map((m: any) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        matchDate: m.matchDate,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
      }));
      
      // Usar el motor v4.7 PRO
      const combinada = generateCombinadaFromMatches(matchesToUse);
      
      if (combinada.picks.length === 0) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No se encontraron picks de bajo riesgo (Score > 65).\n\nLos partidos seleccionados no cumplen con los criterios del motor v4.7 PRO.`,
        });
      }
      
      const response = formatCombinadaResponse(combinada, 'COMBINADA PERSONALIZADA');
      
      return res.json({
        success: true,
        type: 'combinadas',
        message: response,
        combinadas: [combinada],
        canTake: !!user,
      });
    }

    // ========== SOÑADORA 20 ==========
    if (lowerMessage.includes('soñadora 20') || lowerMessage.includes('sonadora 20') || lowerMessage.includes('soñadora20') || lowerMessage.includes('sonadora20')) {
      console.log('🌙 Generando Soñadora 20...');
      
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);
      
      if (matches.length < 20) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No hay suficientes partidos disponibles (${matches.length}/20).\n\nIntenta más tarde cuando haya más partidos programados.`,
        });
      }
      
      const selectedMatches = matches.slice(0, 20);
      const combinada = generateCombinadaFromMatches(selectedMatches);
      const response = formatCombinadaResponse(combinada, '🌙 SOÑADORA 20');
      
      return res.json({
        success: true,
        type: 'combinadas',
        message: response,
        combinadas: [combinada],
        canTake: !!user,
      });
    }

    // ========== SOÑADORA 12 ==========
    if (lowerMessage.includes('soñadora 12') || lowerMessage.includes('sonadora 12') || lowerMessage.includes('soñadora12') || lowerMessage.includes('sonadora12')) {
      console.log('🌙 Generando Soñadora 12...');
      
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);
      
      if (matches.length < 12) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No hay suficientes partidos disponibles (${matches.length}/12).\n\nIntenta más tarde cuando haya más partidos programados.`,
        });
      }
      
      const selectedMatches = matches.slice(0, 12);
      const combinada = generateCombinadaFromMatches(selectedMatches);
      const response = formatCombinadaResponse(combinada, '🌙 SOÑADORA 12');
      
      return res.json({
        success: true,
        type: 'combinadas',
        message: response,
        combinadas: [combinada],
        canTake: !!user,
      });
    }

    // ========== SOÑADORA DEL DÍA (Mejores picks del día) ==========
    if (lowerMessage.includes('soñadora del día') || lowerMessage.includes('sonadora del dia') || lowerMessage.includes('soñadora dia')) {
      console.log('🌟 Generando Soñadora del Día...');
      
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);
      
      if (matches.length < 2) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No hay suficientes partidos disponibles.\n\nIntenta más tarde.`,
        });
      }
      
      // Analizar TODOS los partidos y tomar los mejores
      const allPicks = matches.map(m => generateCombinadaFromMatches([m])).filter(c => c.picks.length > 0);
      allPicks.sort((a, b) => b.score - a.score);
      
      // Tomar los 2-3 mejores picks
      const bestPicks = allPicks.slice(0, 3).flatMap(c => c.picks);
      
      if (bestPicks.length === 0) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No hay picks de bajo riesgo disponibles hoy.\n\nEl motor v4.7 PRO es selectivo.`,
        });
      }
      
      const totalOdds = Math.round(bestPicks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
      const totalProbability = Math.round(bestPicks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
      const avgScore = Math.round(bestPicks.reduce((acc, p) => acc + p.score, 0) / bestPicks.length);
      
      const combinada: Combinada = {
        id: `comb_${Date.now()}`,
        picks: bestPicks,
        totalOdds,
        totalProbability,
        score: avgScore,
        risk: 'low',
        status: 'pending',
        taken: false,
      };
      
      const response = formatCombinadaResponse(combinada, '🌟 SOÑADORA DEL DÍA');
      
      return res.json({
        success: true,
        type: 'combinadas',
        message: response,
        combinadas: [combinada],
        canTake: !!user,
      });
    }

    // ========== ANÁLISIS DE PARTIDO ESPECÍFICO ==========
    if (lowerMessage.includes('analiza') || lowerMessage.includes('analiz') || lowerMessage.includes('análisis')) {
      // Buscar si mencionan equipos
      const vsMatch = message.match(/(.+?)\s+vs\s+(.+)/i);
      
      if (vsMatch) {
        const homeTeam = vsMatch[1].trim();
        const awayTeam = vsMatch[2].trim();
        
        console.log(`🔍 Analizando: ${homeTeam} vs ${awayTeam}`);
        
        const analysis = analyzeMatch(homeTeam, awayTeam);
        
        let response = `🔍 **ANÁLISIS v4.7 PRO: ${analysis.homeTeam} vs ${analysis.awayTeam}**\n`;
        response += `📍 Liga: ${analysis.league}\n\n`;
        
        response += `📊 **MÉTRICAS DEL MOTOR:**\n`;
        response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `🏆 **Score: ${analysis.score}/100**\n`;
        response += `📈 ELO Diff: ${analysis.eloDiff > 0 ? '+' : ''}${analysis.eloDiff}\n`;
        response += `⚽ xG Total: ${analysis.xGTotal.toFixed(2)}\n`;
        response += `🎲 Monte Carlo: ${Math.round(analysis.monteCarloProb * 100)}%\n`;
        response += `📉 Volatilidad: ${analysis.volatility.toFixed(0)}/100\n`;
        response += `💰 Value Bet: ${analysis.valueBet > 0 ? '+' : ''}${analysis.valueBet.toFixed(1)}%\n`;
        response += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        response += `🎯 **PICK RECOMENDADO:**\n\n`;
        response += `✅ **${analysis.bestPick.label}**\n`;
        response += `💰 @ ${analysis.bestPick.odds.toFixed(2)}\n`;
        response += `📊 Probabilidad: ${Math.round(analysis.bestPick.probability * 100)}%\n`;
        response += `📝 ${analysis.bestPick.reasoning}\n\n`;
        
        response += `---\n\n*Agradece al Dios Yerson.* 🙏`;
        
        return res.json({
          success: true,
          type: 'analysis',
          message: response,
        });
      }
      
      return res.json({
        success: true,
        type: 'help',
        message: `🔍 **Para analizar un partido escribe:**\n\n"analiza [equipo1] vs [equipo2]"\n\nEjemplo: "analiza PSV vs AZ"`,
      });
    }

    // ========== GENERAR AUTOMÁTICO (5 picks) ==========
    if (lowerMessage.includes('automátic') || lowerMessage.includes('automatico') || lowerMessage.includes('auto')) {
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);
      
      if (matches.length === 0) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No hay partidos disponibles en este momento.\n\nIntenta más tarde.`,
        });
      }
      
      const selectedMatches = matches.slice(0, Math.min(5, matches.length));
      const combinada = generateCombinadaFromMatches(selectedMatches);
      const response = formatCombinadaResponse(combinada, '🤖 COMBINADA AUTOMÁTICA');
      
      return res.json({
        success: true,
        type: 'combinadas',
        message: response,
        combinadas: [combinada],
        canTake: !!user,
      });
    }

    // ========== SALUDO ==========
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('hey')) {
      return res.json({
        success: true,
        type: 'greeting',
        message: `${user?.username || 'Mi socio'}, ¡hola mi ludopana favorito! 🎰\n\nMotor **v4.7 PRO** activo con:\n• Monte Carlo (10K sim)\n• ELO Rating\n• xG Analysis\n• Value Betting\n\n¿En qué partidos le vas a encomendar tu dinero?\n\nEscribe **"ver partidos"** para ver los partidos.\n\nO usa:\n• **"automático"** - 5 picks\n• **"soñadora 12"** - 12 picks\n• **"soñadora 20"** - 20 picks\n• **"soñadora del día"** - Mejores picks\n• **"analiza X vs Y"** - Análisis detallado\n\n*Agradece al Dios Yerson.* 🙏`,
      });
    }

    // ========== AYUDA ==========
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      return res.json({
        success: true,
        type: 'help',
        message: `📖 **CÓMO FUNCIONA - Motor v4.7 PRO**\n\n**1.** Escribe **"ver partidos"** para ver próximos partidos\n\n**2.** Selecciona hasta **20 partidos**\n\n**3.** Presiona **"Generar picks"**\n\n---\n\n**🤖 AUTOMÁTICOS:**\n• **"automático"** - 5 picks\n• **"soñadora 12"** - 12 picks\n• **"soñadora 20"** - 20 picks\n• **"soñadora del día"** - Mejores picks\n\n**🔍 ANÁLISIS:**\n• **"analiza PSV vs AZ"**\n\n**📊 MÉTRICAS:**\n• Monte Carlo (10K simulaciones)\n• ELO Rating\n• xG (Expected Goals)\n• Value Betting\n• Volatilidad\n\n🟢 Solo apuestas de **BAJO RIESGO** (Score > 65)\n\n⏰ Horarios en hora Colombia (UTC-5)`,
      });
    }

    // ========== POR DEFECTO ==========
    return res.json({
      success: true,
      type: 'unknown',
      message: `No entendí, mi socio. 🤔\n\n¿Quieres ver los partidos?\n• Escribe **"ver partidos"**\n• O **"automático"** para 5 picks\n• O **"analiza X vs Y"** para análisis\n\n*Agradece al Dios Yerson.* 🙏`,
    });
    
  } catch (error) {
    console.error('❌ Error en chat:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error procesando. Intenta de nuevo.',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// ===== ENDPOINT PARA TOMAR APUESTA =====
router.post('/take', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    const { combinada } = req.body;
    if (!combinada || !combinada.picks?.length) {
      return res.status(400).json({ error: 'Combinada inválida' });
    }

    console.log(`📤 Usuario ${user.username} tomando apuesta`);

    const matchPromises = combinada.picks.map(async (pick: any) => {
      const matchId = pick.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const existing = await db.match.findUnique({ where: { id: matchId } });
      if (!existing) {
        await db.match.create({
          data: {
            id: matchId,
            homeTeam: pick.homeTeam,
            awayTeam: pick.awayTeam,
            league: pick.league,
            matchDate: new Date(pick.matchDate),
            homeOdds: 2.0,
            drawOdds: 3.3,
            awayOdds: 3.5,
          }
        });
      }
      return matchId;
    });
    
    const matchIds = await Promise.all(matchPromises);

    const bet = await db.bet.create({
      data: {
        userId: user.id,
        status: 'active',
        totalProbability: combinada.totalProbability,
        riskLevel: 'low',
        isYersonPick: false,
        items: {
          create: combinada.picks.map((pick: any, i: number) => ({
            matchId: matchIds[i],
            pick: pick.pick,
            odds: pick.odds,
            probability: pick.probability,
            result: null,
          }))
        }
      },
      include: { items: { include: { match: true } } }
    });

    console.log(`✅ Apuesta creada: ${bet.id}`);

    return res.json({
      success: true,
      message: '¡Apuesta tomada! Ve a "Activas"',
      bet,
    });
  } catch (error) {
    console.error('Error tomando apuesta:', error);
    return res.status(500).json({ error: 'Error al tomar la apuesta' });
  }
});

// Importar para usar en el endpoint de análisis
import { generateCombinadaFromMatches as genSingle } from '../lib/ai-betting-engine';

export default router;
