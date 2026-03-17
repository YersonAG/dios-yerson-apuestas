// Rutas de Chat - El Dios Yerson
// Motor v5.4 - Multi-Pick Selection (TOP 3 picks por partido)

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
  PickResult,
  SelectablePick,
} from '../lib/ai-betting-engine';

const router = Router();

// ===== FILTRAR PARTIDOS QUE AÚN NO HAN TERMINADO =====
function filterFutureMatches(matches: MatchForApp[]): MatchForApp[] {
  const now = new Date();
  return matches.filter(m => {
    const matchDate = new Date(m.matchDate);
    return matchDate.getTime() + 3 * 60 * 60 * 1000 > now.getTime();
  });
}

// ===== FORMATEAR RESPUESTA CON TOP 3 PICKS =====
function formatCombinadaResponse(pickResults: PickResult[], title: string): string {
  let response = `🎰 **${title}**\n\n`;
  response += `📍 ${pickResults.length} partidos analizados\n\n`;
  response += `---\n\n`;

  pickResults.forEach((result, i) => {
    const date = new Date(result.matchDate);
    const dateStr = date.toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Bogota'
    });

    response += `**${i + 1}. ${result.homeTeam} vs ${result.awayTeam}**\n`;
    response += `📍 ${result.league} | 📅 ${dateStr}\n`;
    response += `🎯 **TOP 3 PICKS:**\n`;

    result.top3Picks.forEach((pick, j) => {
      const selected = pick.selected ? '✅' : '⬜';
      response += `   ${selected} **${j + 1}. ${pick.label}** @ ${pick.odds.toFixed(2)} (${pick.confidence}% confianza)\n`;
    });

    response += `\n`;
  });

  response += `---\n\n🟢 **MOTOR v5.4** - Multi-Pick Selection\n\n*Agradece al Dios Yerson.* 🙏`;
  return response;
}

// ===== ENDPOINT GET =====
router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Motor v5.4 - Multi-Pick Selection (TOP 3 picks por partido)',
    version: '5.4.0',
    features: [
      'ESPN Data Collection',
      'Poisson Distribution',
      'ELO Rating',
      'TOP 3 Picks por partido',
      'Selección múltiple de picks'
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
      console.log(`🎯 Analizando ${selectedMatchesData.length} partidos SELECCIONADOS`);
      const matchesToUse = selectedMatchesData.slice(0, 20) as MatchForApp[];

      // Analizar cada partido
      const pickResults: PickResult[] = [];
      for (const match of matchesToUse) {
        const result = await analyzeMatchAsync(match);
        if (result && result.riskLevel !== 'NO_BET') {
          pickResults.push(result);
        }
      }

      if (pickResults.length === 0) {
        return res.json({
          success: false,
          type: 'error',
          message: `❌ No se encontraron picks de bajo riesgo.\n\nLos partidos seleccionados no cumplen con los criterios del motor v5.4.`,
        });
      }

      pickResults.sort((a, b) => b.pick.confidence - a.pick.confidence);

      // Devolver los resultados con los top 3 picks para selección
      const response = formatCombinadaResponse(pickResults, 'ANÁLISIS COMPLETADO');

      return res.json({
        success: true,
        type: 'showing_picks',
        message: response,
        pickResults: pickResults.map(r => ({
          matchId: r.matchId,
          homeTeam: r.homeTeam,
          awayTeam: r.awayTeam,
          league: r.league,
          matchDate: r.matchDate,
          top3Picks: r.top3Picks,
          riskLevel: r.riskLevel,
        })),
        canTake: !!user,
      });
    }

    // ========== AUTOMÁTICO ==========
    if (lowerMessage.includes('automátic') || lowerMessage.includes('automatico') || lowerMessage.includes('auto')) {
      let matches = await getUpcomingMatches(14);
      matches = filterFutureMatches(matches);

      if (matches.length === 0) {
        return res.json({ success: false, type: 'error', message: `❌ No hay partidos disponibles.` });
      }

      const selectedMatches = matches.slice(0, Math.min(5, matches.length));
      const pickResults: PickResult[] = [];

      for (const match of selectedMatches) {
        const result = await analyzeMatchAsync(match);
        if (result && result.riskLevel !== 'NO_BET') {
          pickResults.push(result);
        }
      }

      const response = formatCombinadaResponse(pickResults, '🤖 ANÁLISIS AUTOMÁTICO');
      return res.json({
        success: true,
        type: 'showing_picks',
        message: response,
        pickResults: pickResults.map(r => ({
          matchId: r.matchId,
          homeTeam: r.homeTeam,
          awayTeam: r.awayTeam,
          league: r.league,
          matchDate: r.matchDate,
          top3Picks: r.top3Picks,
          riskLevel: r.riskLevel,
        })),
        canTake: !!user,
      });
    }

    // ========== SALUDO ==========
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('hey')) {
      return res.json({
        success: true,
        type: 'greeting',
        message: `${user?.username || 'Mi socio'}, ¡hola! 🎰\n\nMotor **v5.4** activo:\n• TOP 3 Picks por partido\n• Selección múltiple\n• ESPN Standings\n\nEscribe **"ver partidos"** para ver los partidos.\n\n*Agradece al Dios Yerson.* 🙏`,
      });
    }

    // ========== AYUDA ==========
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      return res.json({
        success: true,
        type: 'help',
        message: `📖 **CÓMO FUNCIONA - Motor v5.4**\n\n**1.** Escribe **"ver partidos"**\n**2.** Selecciona hasta **20 partidos**\n**3.** El motor mostrará **TOP 3 picks** por partido\n**4.** Selecciona 1, 2 o 3 picks por partido\n**5.** Confirma tu combinada\n\n---\n\n**📊 MOTOR:**\n• Poisson Distribution\n• ELO Rating\n• ESPN Standings\n• TOP 3 Picks por partido\n\n⏰ Horarios en hora Colombia (UTC-5)`,
      });
    }

    // ========== POR DEFECTO ==========
    return res.json({
      success: true,
      type: 'unknown',
      message: `No entendí, mi socio. 🤔\n\n¿Quieres ver los partidos?\n• Escribe **"ver partidos"**\n\n*Agradece al Dios Yerson.* 🙏`,
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

// ===== ENDPOINT PARA CONFIRMAR PICKS SELECCIONADOS =====
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    const { selections } = req.body;
    // selections = [{ matchId: string, selectedIndices: number[] }]

    if (!selections || !Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ error: 'Selecciones requeridas' });
    }

    console.log(`📤 Usuario ${user.username} confirmando ${selections.length} selecciones`);

    // Crear la apuesta con los picks seleccionados
    const bet = await db.bet.create({
      data: {
        userId: user.id,
        status: 'active',
        totalProbability: 0,
        riskLevel: 'low',
        items: {
          create: await Promise.all(selections.map(async (sel: any) => {
            // Crear o encontrar el match
            let match = await db.match.findUnique({ where: { id: sel.matchId } });
            if (!match) {
              match = await db.match.create({
                data: {
                  id: sel.matchId,
                  homeTeam: sel.homeTeam || 'Local',
                  awayTeam: sel.awayTeam || 'Visitante',
                  league: sel.league || 'Mixta',
                  matchDate: new Date(sel.matchDate || new Date()),
                  homeOdds: 2.0,
                  drawOdds: 3.3,
                  awayOdds: 3.5,
                },
              });
            }

            // Obtener los picks seleccionados
            const selectedPicks = sel.selectedPicks || [];
            const mainPick = selectedPicks[0] || { label: 'Pick', odds: 1.5, probability: 0.65 };

            return {
              matchId: match.id,
              pick: mainPick.label,
              odds: mainPick.odds,
              probability: mainPick.probability,
              topPicks: sel.topPicks || [],
              selectedPickIndices: sel.selectedIndices || [0],
            };
          })),
        },
      },
      include: { items: { include: { match: true } } },
    });

    // Calcular probabilidad total
    const items = bet.items;
    const totalOdds = items.reduce((acc, item) => acc * item.odds, 1);
    const totalProbability = items.reduce((acc, item) => acc * item.probability, 1);

    await db.bet.update({
      where: { id: bet.id },
      data: { totalProbability },
    });

    console.log(`✅ Apuesta creada: ${bet.id} con ${items.length} items`);

    return res.json({
      success: true,
      message: '¡Apuesta confirmada! Ve a "Activas"',
      bet: { ...bet, totalOdds },
    });
  } catch (error) {
    console.error('Error confirmando apuesta:', error);
    return res.status(500).json({ error: 'Error al confirmar la apuesta' });
  }
});

// ===== ENDPOINT PARA TOMAR APUESTA (compatibilidad hacia atrás) =====
router.post('/take', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    const { combinada, selections } = req.body;

    // Si hay selecciones nuevas, usar el endpoint de confirm
    if (selections && Array.isArray(selections)) {
      // Reenviar al endpoint de confirm
      const confirmRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/chat/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
        },
        body: JSON.stringify({ selections }),
      });
      return res.json(await confirmRes.json());
    }

    // Compatibilidad hacia atrás con el formato antiguo
    if (!combinada || !combinada.picks?.length) {
      return res.status(400).json({ error: 'Combinada inválida' });
    }

    console.log(`📤 Usuario ${user.username} tomando apuesta (formato antiguo)`);

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
            topPicks: pick.topPicks || null,
            selectedPickIndices: pick.selectedPickIndices || [0],
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
