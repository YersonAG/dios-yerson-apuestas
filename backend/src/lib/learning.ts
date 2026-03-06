// Sistema de Aprendizaje - Mejora continua de picks
// "El Dios Yerson aprende de cada apuesta"

import { db } from './db';

interface LearningInsight {
  pickType: string;
  league: string;
  successRate: number;
  totalPicks: number;
  recommendation: 'increase' | 'maintain' | 'decrease';
  confidence: number;
}

// Actualizar datos de aprendizaje después de cada resultado
export async function updateLearningData(
  pickType: string,
  league: string,
  won: boolean
): Promise<void> {
  try {
    const existing = await db.learningData.findFirst({
      where: { pickType, league },
    });

    if (existing) {
      const newTotalPicks = existing.totalPicks + 1;
      const newWonPicks = existing.wonPicks + (won ? 1 : 0);
      const newSuccessRate = newWonPicks / newTotalPicks;

      await db.learningData.update({
        where: { id: existing.id },
        data: {
          totalPicks: newTotalPicks,
          wonPicks: newWonPicks,
          successRate: newSuccessRate,
        },
      });
    } else {
      await db.learningData.create({
        data: {
          pickType,
          league,
          totalPicks: 1,
          wonPicks: won ? 1 : 0,
          successRate: won ? 1 : 0,
        },
      });
    }
  } catch (error) {
    console.error('Error updating learning data:', error);
  }
}

// Procesar resultado de apuesta y actualizar aprendizaje
export async function processBetResult(betId: string): Promise<void> {
  const bet = await db.bet.findUnique({
    where: { id: betId },
    include: {
      items: {
        include: { match: true },
      },
    },
  });

  if (!bet) return;

  for (const item of bet.items) {
    if (item.result) {
      await updateLearningData(
        item.pick,
        item.match.league,
        item.result === 'won'
      );
    }
  }
}

export { type LearningInsight };
