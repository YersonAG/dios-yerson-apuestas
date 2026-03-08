// Rutas de Chat - El Dios Yerson
// Motor v5.0 PRO - Poisson + ELO + ESPN + Goles Reales

import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';
import { getUpcomingMatches, MatchForApp } from '../lib/football-api';
import {
  generateCombinadaFromMatchesAsync,
  analyzeMatchAsync,
  analyzeMatches,
  MatchPick,
  Combinada,
} from '../lib/ai-betting-engine';

const router = Router();

// ===== FILTRAR PARTIDOS QUE AÚN NO HAN TERMINADO =====
function filterFutureMatches(matches: MatchForApp[]): MatchForApp[] {
  const now = new Date();
  return matches.filter(m => {
    const matchDate = new Date(m.matchDate);
    // Solo filtrar partidos que ya terminaron, NO los que están por empezar
    return matchDate.getTime() + 3 * 60 * 60 * 1000 > now.getTime(); // +3 horas para partidos en vivo
  });
}

// ===== FORMATEAR RESPUESTA =====
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
    response += `📊 Score: **${pick.score}/100**\n`;
    response += `📉 Riesgo: ${pick.volatility < 30 ? '🟢 BAJO' : pick.volatility < 50 ? '🟡 MEDIO' : '🔴 ALTO'}\n`;
    if (pick.safePicks && pick.safePicks.length > 1) {
      response += `💡 Otros picks: ${pick.safePicks.slice(0, 3).join(' | ')}\n`;
    }
    response += `\n`;
  });

  response += `---\n\n🟢 **MOTOR v5.0** - Poisson + ELO + ESPN + Goles Reales\n\n*Agradece al Dios Yerson.* 🙏`;
  return response;
}

// ===== ENDPOINT GET =====
router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Motor v5.0 PRO - Poisson + ELO + ESPN + Goles Reales',
    version: '5.0.0',
    features: [
      'ESPN Data Collection',
      'Poisson Distribution',
      'ELO Rating',
      'Goles REALES de ESPN Standings v2',
      'Picks variados y seguros'
    ]
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
    if (lowerMessage.includes('ver partido') || lowerMessage.includes('partidos') || lowerMessage.includes('ver') || lowerMessage.includes('lista')) {
      console.log('📋 Obteniendo partidos...');
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);

      console.log(`✅ Enviando ${matches.length} partidos`);

      return res.json({
        success: true,
        type: 'showing_matches',
        message: `📋 **PARTIDOS DISPONIBLES**\n\n🗓️ Total: ${matches.length} partidos próximos\n\n⏰ Horario Colombia (UTC-5)\n\nSelecciona los partidos para tu combinada:`,
        availableMatches: matches,
      });
    }

    // ========== GENERAR COMBINADA CON PARTIDOS SELECCIONADOS ==========
    if (selectedMatchesData && Array.isArray(selectedMatchesData) && selectedMatchesData.length > 0) {
      console.log(`🎯 Generando combinada con ${selectedMatchesData.length} partidos SELECCIONADOS`);
      const matchesToUse = selectedMatchesData.slice(0, 20) as MatchForApp[];
      const combinada = await generateCombinadaFromMatchesAsync(matchesToUse);

      if (combinada.picks.length === 0) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No se encontraron picks de bajo riesgo (Score >= 65).\n\nLos partidos seleccionados no cumplen con los criterios del motor v5.0.`,
        });
      }

      const response = formatCombinadaResponse(combinada, 'COMBINADA PERSONALIZADA');
      return res.json({ success: true, type: 'combinadas', message: response, combinadas: [combinada], canTake: !!user });
    }

    // ========== AUTOMÁTICO ==========
    if (lowerMessage.includes('automátic') || lowerMessage.includes('automatico') || lowerMessage.includes('auto')) {
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);

      if (matches.length === 0) {
        return res.json({ success: false, type: 'error', message: `❌ No hay partidos disponibles.` });
      }

      const selectedMatches = matches.slice(0, Math.min(5, matches.length));
      const combinada = await generateCombinadaFromMatchesAsync(selectedMatches);
      const response = formatCombinadaResponse(combinada, '🤖 COMBINADA AUTOMÁTICA');
      return res.json({ success: true, type: 'combinadas', message: response, combinadas: [combinada], canTake: !!user });
    }

    // ========== SOÑADORA 12 ==========
    if (lowerMessage.includes('soñadora 12') || lowerMessage.includes('sonadora 12')) {
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);

      if (matches.length < 12) {
        return res.json({ success: false, type: 'error', message: `❌ No hay suficientes partidos (${matches.length}/12).` });
      }

      const selectedMatches = matches.slice(0, 12);
      const combinada = await generateCombinadaFromMatchesAsync(selectedMatches);
      const response = formatCombinadaResponse(combinada, '🌙 SOÑADORA 12');
      return res.json({ success: true, type: 'combinadas', message: response, combinadas: [combinada], canTake: !!user });
    }

    // ========== SOÑADORA 20 ==========
    if (lowerMessage.includes('soñadora 20') || lowerMessage.includes('sonadora 20')) {
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);

      if (matches.length < 20) {
        return res.json({ success: false, type: 'error', message: `❌ No hay suficientes partidos (${matches.length}/20).` });
      }

      const selectedMatches = matches.slice(0, 20);
      const combinada = await generateCombinadaFromMatchesAsync(selectedMatches);
      const response = formatCombinadaResponse(combinada, '🌙 SOÑADORA 20');
      return res.json({ success: true, type: 'combinadas', message: response, combinadas: [combinada], canTake: !!user });
    }

    // ========== SALUDO ==========
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('hey')) {
      return res.json({
        success: true,
        type: 'greeting',
        message: `${user?.username || 'Mi socio'}, ¡hola! 🎰\n\nMotor **v5.0 PRO** activo:\n• Poisson Distribution\n• ELO Rating\n• Goles REALES de ESPN\n\nEscribe **"ver partidos"** para ver los partidos.\n\nO usa:\n• **"automático"** - 5 picks\n• **"soñadora 12"** - 12 picks\n• **"soñadora 20"** - 20 picks\n\n*Agradece al Dios Yerson.* 🙏`,
      });
    }

    // ========== AYUDA ==========
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      return res.json({
        success: true,
        type: 'help',
        message: `📖 **CÓMO FUNCIONA - Motor v5.0**\n\n**1.** Escribe **"ver partidos"**\n**2.** Selecciona hasta **20 partidos**\n**3.** Presiona **"Generar picks"**\n\n---\n\n**🤖 AUTOMÁTICOS:**\n• **"automático"** - 5 picks\n• **"soñadora 12"** - 12 picks\n• **"soñadora 20"** - 20 picks\n\n**📊 MOTOR:**\n• Poisson Distribution\n• ELO Rating\n• Goles REALES de ESPN Standings\n\n🟢 Solo apuestas de **BAJO RIESGO** (Score >= 65)\n\n⏰ Horarios en hora Colombia (UTC-5)`,
      });
    }

    // ========== POR DEFECTO ==========
    return res.json({
      success: true,
      type: 'unknown',
      message: `No entendí, mi socio. 🤔\n\n¿Quieres ver los partidos?\n• Escribe **"ver partidos"**\n• O **"automático"** para 5 picks\n\n*Agradece al Dios Yerson.* 🙏`,
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

export default router;
