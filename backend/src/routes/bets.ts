// Rutas de Apuestas - El Dios Yerson
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';
import { type Combinada } from '../lib/betting-engine';
import { getMatchResults, evaluatePickResult } from '../lib/football-api';

const router = Router();

// GET /api/bets - Obtener apuestas del usuario (con verificación automática de resultados)
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado', bets: [] });
    }

    const status = (req.query.status as string) || 'active';
    const autoCheck = req.query.autoCheck !== 'false'; // Por defecto verificar resultados

    // Si se piden apuestas activas, verificar resultados automáticamente
    if (status === 'active' && autoCheck) {
      await checkAndResultsForUser(user.id);
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

// Función interna para verificar resultados de un usuario
async function checkAndResultsForUser(userId: string) {
  try {
    // Buscar apuestas activas
    const activeBets = await db.bet.findMany({
      where: { userId, status: 'active' },
      include: { items: { include: { match: true } } },
    });

    if (activeBets.length === 0) return;

    const now = new Date();
    
    for (const bet of activeBets) {
      // Buscar items sin resultado cuyo partido ya terminó
      const pendingItems = bet.items.filter(item => {
        if (item.result) return false; // Ya tiene resultado
        const matchDate = item.match.matchDate;
        if (!matchDate) return false;
        // El partido terminó si la fecha + 2 horas ya pasó
        const matchEndTime = new Date(matchDate);
        matchEndTime.setHours(matchEndTime.getHours() + 2);
        return matchEndTime < now;
      });

      if (pendingItems.length === 0) continue;

      // Obtener resultados para estos partidos
      const matchIds = pendingItems.map(item => item.matchId);
      const results = await getMatchResults(matchIds);

      // Evaluar cada pick
      for (const item of pendingItems) {
        const matchResult = results.find(r => r.id === item.matchId);
        
        if (matchResult) {
          const result = evaluatePickResult(item.pick, matchResult.homeScore, matchResult.awayScore);
          
          // Actualizar el item
          await db.betItem.update({
            where: { id: item.id },
            data: { result },
          });

          // Actualizar el match con el score y estado
          await db.match.update({
            where: { id: item.matchId },
            data: {
              homeScore: matchResult.homeScore,
              awayScore: matchResult.awayScore,
              status: 'FINISHED',
            },
          });

          console.log(`📊 Pick ${item.pick}: ${result} (${matchResult.homeScore}-${matchResult.awayScore})`);
        }
      }

      // Verificar si todos los items tienen resultado
      const allItems = await db.betItem.findMany({ where: { betId: bet.id } });
      const allResolved = allItems.every(item => item.result);
      
      if (allResolved) {
        const allWon = allItems.every(item => item.result === 'won');
        const anyLost = allItems.some(item => item.result === 'lost');
        const finalResult = anyLost ? 'lost' : 'won';

        // Actualizar la apuesta
        await db.bet.update({
          where: { id: bet.id },
          data: { status: finalResult },
        });

        // Crear registro en historial
        const totalOdds = allItems.reduce((acc, item) => acc * item.odds, 1);
        await db.betHistory.create({
          data: {
            betId: bet.id,
            userId,
            result: finalResult,
            totalOdds,
            matchesCount: allItems.length,
          },
        });

        console.log(`🏆 Apuesta ${bet.id}: ${finalResult.toUpperCase()}`);
      }
    }
  } catch (error) {
    console.error('Error verificando resultados:', error);
  }
}

// POST /api/bets/check-results - Forzar verificación de resultados
router.post('/check-results', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    await checkAndResultsForUser(user.id);

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

    // Crear los partidos y la apuesta
    const bet = await db.bet.create({
      data: {
        userId: user.id,
        status: 'active',
        totalProbability: combinada.totalProbability,
        riskLevel: combinada.risk,
      },
    });

    for (const pick of combinada.picks) {
      // Parsear el match string
      const matchParts = pick.match.split(' vs ');
      const homeTeam = matchParts[0];
      const awayTeam = matchParts[1]?.split(' (')[0] || 'Unknown';
      const league = pick.match.match(/\(([^)]+)\)/)?.[1] || 'Mixta';
      
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() + Math.floor(Math.random() * 3));

      const match = await db.match.create({
        data: {
          homeTeam,
          awayTeam,
          league,
          matchDate,
          homeOdds: pick.odds,
          drawOdds: 3.5,
          awayOdds: pick.odds > 2 ? pick.odds + 0.5 : 3.0,
        },
      });

      await db.betItem.create({
        data: {
          betId: bet.id,
          matchId: match.id,
          pick: pick.pick,
          odds: pick.odds,
          probability: pick.probability,
        },
      });
    }

    const fullBet = await db.bet.findUnique({
      where: { id: bet.id },
      include: { items: { include: { match: true } } },
    });

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
