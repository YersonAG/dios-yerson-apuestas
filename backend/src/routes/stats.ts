// Rutas de Estadísticas - El Dios Yerson
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req.headers.authorization);
    
    if (!user) {
      return res.json({
        totalBets: 0,
        wonBets: 0,
        lostBets: 0,
        winRate: 0,
        learningStats: [],
      });
    }

    const bets = await db.bet.findMany({ where: { userId: user.id } });
    
    const totalBets = bets.length;
    const wonBets = bets.filter(b => b.status === 'won').length;
    const lostBets = bets.filter(b => b.status === 'lost').length;
    const winRate = totalBets > 0 ? wonBets / totalBets : 0;

    const learningData = await db.learningData.findMany({
      orderBy: { successRate: 'desc' },
      take: 10,
    });

    const learningStats = learningData.map(item => ({
      pickType: item.pickType,
      league: item.league,
      successRate: item.successRate,
      totalPicks: item.totalPicks,
      wonPicks: item.wonPicks,
    }));

    return res.json({
      totalBets,
      wonBets,
      lostBets,
      winRate,
      learningStats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      totalBets: 0,
      wonBets: 0,
      lostBets: 0,
      winRate: 0,
      learningStats: [],
    });
  }
});

export default router;
