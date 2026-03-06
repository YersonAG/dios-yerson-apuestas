// Rutas de Historial - El Dios Yerson
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.json({
        history: [],
        stats: { total: 0, won: 0, lost: 0, winRate: 0, totalOddsWon: 0, avgOdds: 0 },
      });
    }

    const limit = parseInt((req.query.limit as string) || '20');

    const history = await db.betHistory.findMany({
      where: { userId: user.id },
      include: {
        bet: {
          include: { items: { include: { match: true } } },
        },
      },
      orderBy: { dateCompleted: 'desc' },
      take: limit,
    });

    const formattedHistory = history.map(h => ({
      id: h.id,
      result: h.result,
      totalOdds: h.totalOdds,
      matchesCount: h.matchesCount,
      dateCompleted: h.dateCompleted,
      bet: {
        riskLevel: h.bet?.riskLevel,
        isYersonPick: h.bet?.isYersonPick,
        items: h.bet?.items?.map(item => ({
          pick: item.pick,
          odds: item.odds,
          result: item.result,
          match: {
            homeTeam: item.match?.homeTeam,
            awayTeam: item.match?.awayTeam,
            league: item.match?.league,
          },
        })) || [],
      },
    }));

    const wonCount = history.filter(h => h.result === 'won').length;
    const lostCount = history.filter(h => h.result === 'lost').length;
    const totalOddsWon = history
      .filter(h => h.result === 'won')
      .reduce((acc, h) => acc + h.totalOdds, 0);
    const avgOdds = history.length > 0 
      ? history.reduce((acc, h) => acc + h.totalOdds, 0) / history.length 
      : 0;

    return res.json({
      history: formattedHistory,
      stats: {
        total: history.length,
        won: wonCount,
        lost: lostCount,
        winRate: history.length > 0 ? wonCount / history.length : 0,
        totalOddsWon,
        avgOdds,
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({
      history: [],
      stats: { total: 0, won: 0, lost: 0, winRate: 0, totalOddsWon: 0, avgOdds: 0 },
    });
  }
});

export default router;
