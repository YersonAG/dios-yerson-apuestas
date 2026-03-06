// Rutas de Chat - El Dios Yerson
// Simplificado para mayor robustez

import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { getCurrentUser } from './auth';
import { getUpcomingMatches, MatchForApp } from '../lib/football-api';

const router = Router();

// ===== GENERADOR DE PICKS DE BAJO RIESGO =====
function generateLowRiskPick(match: MatchForApp): { pick: string; odds: number; probability: number } {
  // Generar picks de bajo riesgo que el sistema puede evaluar
  const picks = [
    { pick: 'Doble oportunidad 1X', odds: 1.35, probability: 0.74 },
    { pick: 'Doble oportunidad X2', odds: 1.40, probability: 0.71 },
    { pick: 'Más de 1.5 goles', odds: 1.25, probability: 0.80 },
    { pick: 'Menos de 4.5 goles', odds: 1.15, probability: 0.87 },
    { pick: 'Doble oportunidad 1X', odds: 1.30, probability: 0.77 },
    { pick: 'Más de 0.5 goles', odds: 1.10, probability: 0.91 },
    { pick: 'Menos de 3.5 goles', odds: 1.20, probability: 0.83 },
    { pick: 'Doble oportunidad X2', odds: 1.38, probability: 0.72 },
  ];
  
  // Seleccionar pick basado en hash del ID para consistencia
  const hash = match.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return picks[hash % picks.length];
}

// ===== ENDPOINT GET (para probar) =====
router.get('/', async (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    message: 'Endpoint de chat activo. Usa POST para enviar mensajes.',
    hint: 'POST {"message": "ver partidos"}'
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
      
      const matches = await getUpcomingMatches(14);
      
      console.log(`✅ Enviando ${matches.length} partidos`);
      
      // Crear resumen de fechas
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
        message: `📋 **PARTIDOS DISPONIBLES**\n\n${dateInfo}🗓️ Total: ${matches.length} partidos próximos\n\n⏰ Horario Colombia (UTC-5)\n\nSelecciona los partidos para tu combinada:`,
        availableMatches: matches,
      });
    }

    // ========== GENERAR COMBINADA ==========
    if (selectedMatchesData && Array.isArray(selectedMatchesData) && selectedMatchesData.length > 0) {
      console.log(`🎯 Generando combinada con ${selectedMatchesData.length} partidos`);
      
      const picks = selectedMatchesData.map((match: MatchForApp, index: number) => {
        const pick = generateLowRiskPick(match);
        return {
          matchId: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          matchDate: match.matchDate,
          pick: pick.pick,
          odds: pick.odds,
          probability: pick.probability,
          status: 'pending',
        };
      });
      
      const totalOdds = Math.round(picks.reduce((acc: number, p: any) => acc * p.odds, 1) * 100) / 100;
      const totalProbability = Math.round(picks.reduce((acc: number, p: any) => acc * p.probability, 1) * 1000) / 1000;
      
      const combinada = {
        id: `comb_${Date.now()}`,
        picks,
        totalOdds,
        totalProbability,
        risk: 'low' as const,
        status: 'pending' as const,
      };
      
      let response = `🎰 **COMBINADA GENERADA**\n\n`;
      response += `📊 Probabilidad: **${(totalProbability * 100).toFixed(0)}%**\n`;
      response += `💰 Cuota total: **${totalOdds.toFixed(2)}**\n\n`;
      response += `---\n\n`;
      
      picks.forEach((pick: any, i: number) => {
        const date = new Date(pick.matchDate);
        const dateStr = date.toLocaleDateString('es-CO', { 
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          timeZone: 'America/Bogota'
        });
        response += `**${i + 1}. ${pick.homeTeam} vs ${pick.awayTeam}**\n`;
        response += `📍 ${pick.league} | 📅 ${dateStr}\n`;
        response += `✅ **${pick.pick}** @ ${pick.odds.toFixed(2)}\n\n`;
      });
      
      response += `---\n\n🟢 **BAJO RIESGO**\n\n*Agradece al Dios Yerson.* 🙏`;
      
      return res.json({
        success: true,
        type: 'combinadas',
        message: response,
        combinadas: [combinada],
        canTake: !!user,
      });
    }

    // ========== GENERAR AUTOMÁTICO ==========
    if (lowerMessage.includes('automátic') || lowerMessage.includes('automatico') || lowerMessage.includes('auto')) {
      const matches = await getUpcomingMatches(14);
      const selectedMatches = matches.slice(0, 5); // Tomar 5 partidos próximos
      
      const picks = selectedMatches.map((match) => {
        const pick = generateLowRiskPick(match);
        return {
          matchId: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          matchDate: match.matchDate,
          pick: pick.pick,
          odds: pick.odds,
          probability: pick.probability,
          status: 'pending',
        };
      });
      
      const totalOdds = Math.round(picks.reduce((acc, p) => acc * p.odds, 1) * 100) / 100;
      const totalProbability = Math.round(picks.reduce((acc, p) => acc * p.probability, 1) * 1000) / 1000;
      
      const combinada = {
        id: `comb_auto_${Date.now()}`,
        picks,
        totalOdds,
        totalProbability,
        risk: 'low' as const,
        status: 'pending' as const,
      };
      
      let response = `🎰 **COMBINADA AUTOMÁTICA**\n\n`;
      response += `📊 Probabilidad: **${(totalProbability * 100).toFixed(0)}%**\n`;
      response += `💰 Cuota total: **${totalOdds.toFixed(2)}**\n\n`;
      response += `---\n\n`;
      
      picks.forEach((pick, i) => {
        const date = new Date(pick.matchDate);
        const dateStr = date.toLocaleDateString('es-CO', { 
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          timeZone: 'America/Bogota'
        });
        response += `**${i + 1}. ${pick.homeTeam} vs ${pick.awayTeam}**\n`;
        response += `📍 ${pick.league} | 📅 ${dateStr}\n`;
        response += `✅ **${pick.pick}** @ ${pick.odds.toFixed(2)}\n\n`;
      });
      
      response += `---\n\n🟢 **BAJO RIESGO**\n\n*Agradece al Dios Yerson.* 🙏`;
      
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
        message: `${user?.username || 'Mi socio'}, ¡hola mi ludopana favorito! 🎰\n\n¿En qué partidos le vas a encomendar tu dinero al El Dios Yerson?\n\nEscribe **"ver partidos"** para ver los partidos disponibles.\n\n*Agradece al Dios Yerson.* 🙏`,
      });
    }

    // ========== AYUDA ==========
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      return res.json({
        success: true,
        type: 'help',
        message: `📖 **CÓMO FUNCIONA**\n\n**1.** Escribe **"ver partidos"** para ver partidos próximos\n\n**2.** Selecciona los partidos que quieras\n\n**3.** Presiona **"Generar picks"** para obtener apuestas de bajo riesgo\n\n**4.** Presiona **"Tomar Apuesta"** para guardarla\n\n---\n💡 También puedes escribir **"automático"** para generar una combinada rápidamente\n\n🟢 Solo apuestas de **BAJO RIESGO**\n\n⏰ Horarios mostrados en hora Colombia (UTC-5)`,
      });
    }

    // ========== POR DEFECTO ==========
    return res.json({
      success: true,
      type: 'unknown',
      message: `No entendí, mi socio. 🤔\n\n¿Quieres ver los partidos?\n• Escribe **"ver partidos"**\n• O escribe **"automático"**\n\n*Agradece al Dios Yerson.* 🙏`,
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

    // Crear partidos en BD
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

    // Crear la apuesta
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
