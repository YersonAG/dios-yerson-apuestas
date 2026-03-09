// Rutas de Apuestas - El Dios Yerson
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';
import { type Combinada } from '../lib/betting-engine';
import { getMatchResults, evaluatePickResult, getLiveScores } from '../lib/football-api';

const router = Router();

// GET /api/bets - Obtener apuestas del usuario (con scores en vivo)
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado', bets: [] });
    }

    const status = (req.query.status as string) || 'active';
    const autoCheck = req.query.autoCheck !== 'false';

    // Si se piden apuestas activas, verificar resultados y obtener scores en vivo
    if (status === 'active' && autoCheck) {
      await checkAndUpdateLiveScores(user.id);
    }

    const bets = await db.bet.findMany({
      where: { userId: user.id, status },
      include: { items: { include: { match: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ bets });
  } catch (error) {
    console.error('Error obteniendo apuestas:', error);
    return res.status(500).json({ error: 'Error obteniendo apuestas', bets: [] });
  }
});

// Función para obtener y actualizar scores en vivo
async function checkAndUpdateLiveScores(userId: string) {
  try {
    // Buscar apuestas activas
    const activeBets = await db.bet.findMany({
      where: { userId, status: 'active' },
      include: { items: { include: { match: true } } },
    });

    if (activeBets.length === 0) return;

    const now = new Date();

    // Recopilar todos los matchIds
    const allMatchIds: string[] = [];
    for (const bet of activeBets) {
      for (const item of bet.items) {
        if (allMatchIds.includes(item.matchId)) continue;
        
        const matchDate = item.match.matchDate;
        if (!matchDate) continue;
        
        // Solo partidos de ayer, hoy o mañana
        const matchDateObj = new Date(matchDate);
        const diffDays = (matchDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= -1 && diffDays <= 1) {
          allMatchIds.push(item.matchId);
        }
      }
    }

    if (allMatchIds.length === 0) return;

    console.log(`📊 Obteniendo scores en vivo para ${allMatchIds.length} partidos...`);

    // Obtener scores en vivo
    const liveScores = await getLiveScores(allMatchIds);

    // Actualizar cada partido
    for (const bet of activeBets) {
      for (const item of bet.items) {
        const liveScore = liveScores.get(item.matchId);
        
        if (!liveScore) continue;

        // Actualizar el match con el score y minuto
        await db.match.update({
          where: { id: item.matchId },
          data: {
            homeScore: liveScore.homeScore,
            awayScore: liveScore.awayScore,
            minute: liveScore.minute,
            status: liveScore.status === 'live' ? 'LIVE' : liveScore.status === 'finished' ? 'FINISHED' : 'Scheduled',
          },
        });

        // Si el partido terminó y el item no tiene resultado, evaluarlo
        if (liveScore.status === 'finished' && !item.result) {
          const result = evaluatePickResult(item.pick, liveScore.homeScore, liveScore.awayScore);
          
          await db.betItem.update({
            where: { id: item.id },
            data: { result },
          });

          console.log(`📊 Pick ${item.pick}: ${result} (${liveScore.homeScore}-${liveScore.awayScore})`);
        }
      }

      // Verificar si todos los items tienen resultado
      const allItems = await db.betItem.findMany({ where: { betId: bet.id } });
      const allResolved = allItems.every(item => item.result);

      if (allResolved) {
        const anyLost = allItems.some(item => item.result === 'lost');
        const finalResult = anyLost ? 'lost' : 'won';

        await db.bet.update({
          where: { id: bet.id },
          data: { status: finalResult },
        });

        // Crear registro en historial
        const totalOdds = allItems.reduce((acc, item) => acc * item.odds, 1);
        
        const existingHistory = await db.betHistory.findFirst({
          where: { betId: bet.id }
        });
        
        if (!existingHistory) {
          await db.betHistory.create({
            data: {
              betId: bet.id,
              userId,
              result: finalResult,
              totalOdds,
              matchesCount: allItems.length,
            },
          });
        }

        console.log(`🏆 Apuesta ${bet.id}: ${finalResult.toUpperCase()}`);
      }
    }

  } catch (error) {
    console.error('Error actualizando scores en vivo:', error);
  }
}

// POST /api/bets/check-results - Forzar verificación de resultados
router.post('/check-results', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    await checkAndUpdateLiveScores(user.id);

    // Devolver las apuestas actualizadas
    const bets = await db.bet.findMany({
      where: { userId: user.id, status: 'active' },
      include: { items: { include: { match: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      message: 'Resultados verificados',
      bets,
    });
  } catch (error) {
    console.error('Error en check-results:', error);
    return res.status(500).json({ error: 'Error verificando resultados' });
  }
});

// GET /api/bets/:id - Obtener una apuesta específica
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const bet = await db.bet.findFirst({
      where: { id, userId: user.id },
      include: { items: { include: { match: true } } },
    });

    if (!bet) {
      return res.status(404).json({ error: 'Apuesta no encontrada' });
    }

    return res.json({ bet });
  } catch (error) {
    console.error('Error obteniendo apuesta:', error);
    return res.status(500).json({ error: 'Error obteniendo apuesta' });
  }
});

// POST /api/bets - Crear nueva apuesta
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'Debes iniciar sesión para crear apuestas' });
    }

    const { combinada } = req.body as { combinada: Combinada };

    if (!combinada || !combinada.picks || combinada.picks.length === 0) {
      return res.status(400).json({ error: 'Combinada inválida' });
    }

    console.log(`📤 Usuario ${user.username} tomando apuesta con ${combinada.picks.length} picks`);

    // Crear los partidos y la apuesta
    const bet = await db.bet.create({
      data: {
        userId: user.id,
        status: 'active',
        totalProbability: combinada.totalProbability || 0,
        riskLevel: combinada.risk || 'low',
      },
    });

    for (const pick of combinada.picks) {
      // Usar los datos directamente del pick (formato del motor v5.2)
      const matchId = pick.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const homeTeam = pick.homeTeam || 'Local';
      const awayTeam = pick.awayTeam || 'Visitante';
      const league = pick.league || 'Mixta';
      const matchDate = pick.matchDate ? new Date(pick.matchDate) : new Date();

      // Verificar si el partido ya existe
      const existingMatch = await db.match.findUnique({ where: { id: matchId } });
      
      if (!existingMatch) {
        await db.match.create({
          data: {
            id: matchId,
            homeTeam,
            awayTeam,
            league,
            matchDate,
            homeOdds: pick.odds || 2.0,
            drawOdds: 3.3,
            awayOdds: 3.5,
          },
        });
      }

      await db.betItem.create({
        data: {
          betId: bet.id,
          matchId: matchId,
          pick: pick.pick || 'Pick',
          odds: pick.odds || 1.0,
          probability: pick.probability || 0.5,
        },
      });
    }

    const fullBet = await db.bet.findUnique({
      where: { id: bet.id },
      include: { items: { include: { match: true } } },
    });

    console.log(`✅ Apuesta creada: ${bet.id}`);

    return res.json({
      success: true,
      bet: fullBet,
      message: '¡Apuesta registrada! El Dios Yerson la tiene en el radar.',
    });
  } catch (error) {
    console.error('Error creando apuesta:', error);
    return res.status(500).json({ error: 'Error creando apuesta' });
  }
});

// PUT /api/bets/:id - Actualizar resultado
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const { result, itemId } = req.body;

    const bet = await db.bet.findFirst({
      where: { id, userId: user.id },
    });

    if (!bet) {
      return res.status(404).json({ error: 'Apuesta no encontrada' });
    }

    if (itemId) {
      await db.betItem.update({
        where: { id: itemId },
        data: { result },
      });

      const allItems = await db.betItem.findMany({ where: { betId: id } });
      const allResolved = allItems.every(item => item.result);
      const allWon = allItems.every(item => item.result === 'won');
      const anyLost = allItems.some(item => item.result === 'lost');

      if (allResolved) {
        const finalResult = anyLost ? 'lost' : 'won';
        
        const updatedBet = await db.bet.update({
          where: { id },
          data: { status: finalResult },
        });

        const totalOdds = allItems.reduce((acc, item) => acc * item.odds, 1);
        
        await db.betHistory.create({
          data: {
            betId: id,
            userId: user.id,
            result: finalResult,
            totalOdds,
            matchesCount: allItems.length,
          },
        });

        return res.json({
          success: true,
          bet: updatedBet,
          finalResult,
          message: finalResult === 'won' 
            ? '¡COMBINADA GANADA! 🎉'
            : 'Combinada perdida 😢',
        });
      }

      return res.json({ success: true, message: 'Resultado actualizado' });
    }

    const updatedBet = await db.bet.update({
      where: { id },
      data: { status: result },
    });

    return res.json({
      success: true,
      bet: updatedBet,
      message: 'Apuesta actualizada',
    });
  } catch (error) {
    console.error('Error actualizando apuesta:', error);
    return res.status(500).json({ error: 'Error actualizando apuesta' });
  }
});

// DELETE /api/bets/:id - Eliminar apuesta
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const bet = await db.bet.findFirst({ where: { id, userId: user.id } });

    if (!bet) {
      return res.status(404).json({ error: 'Apuesta no encontrada' });
    }

    await db.betItem.deleteMany({ where: { betId: id } });
    await db.betHistory.deleteMany({ where: { betId: id } });
    await db.bet.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Apuesta eliminada',
    });
  } catch (error) {
    console.error('Error eliminando apuesta:', error);
    return res.status(500).json({ error: 'Error eliminando apuesta' });
  }
});

export default router;
