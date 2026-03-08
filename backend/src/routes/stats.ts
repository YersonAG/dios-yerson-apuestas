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
        activeBets: 0,
        wonBets: 0,
        lostBets: 0,
        winRate: 0,
        learningStats: [],
      });
    }

    // Contar todas las apuestas por estado
    const totalBets = await db.bet.count({ where: { userId: user.id } });
    const activeBets = await db.bet.count({ where: { userId: user.id, status: 'active' } });
    const wonBets = await db.bet.count({ where: { userId: user.id, status: 'won' } });
    const lostBets = await db.bet.count({ where: { userId: user.id, status: 'lost' } });
    
    // Calcular win rate solo de apuestas completadas
    const completedBets = wonBets + lostBets;
    const winRate = completedBets > 0 ? wonBets / completedBets : 0;

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
      activeBets,
      wonBets,
      lostBets,
      winRate,
      learningStats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      totalBets: 0,
      activeBets: 0,
      wonBets: 0,
      lostBets: 0,
      winRate: 0,
      learningStats: [],
    });
  }
});

export default router;
