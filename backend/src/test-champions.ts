// Test específico para partidos de Champions League
import { getUpcomingMatches } from './lib/football-api';
import { analyzeMatchAsync } from './lib/ai-betting-engine';

async function testChampions() {
  console.log('\n🧪 TEST: Analizando partidos de Champions League\n');

  const matches = await getUpcomingMatches(7);
  const clMatches = matches.filter(m => m.league === 'Champions League');
  
  console.log(`\n📊 ${clMatches.length} partidos de Champions League encontrados\n`);

  for (const m of clMatches.slice(0, 5)) {
    console.log(`\n========================================`);
    console.log(`🔍 ${m.homeTeam} vs ${m.awayTeam}`);
    console.log(`========================================`);
    
    const result = await analyzeMatchAsync(m);
    
    console.log(`\n🎯 Pick: ${result.pick.label}`);
    console.log(`📊 Confianza: ${result.pick.confidence}%`);
    console.log(`📈 Probabilidad: ${(result.pick.probability * 100).toFixed(0)}%`);
    console.log(`💰 Cuota: ${(1 / result.pick.probability).toFixed(2)}`);
    console.log(`📉 Riesgo: ${result.riskLevel}`);
    console.log(`📝 Razón: ${result.pick.reasoning[0]}`);
    
    console.log(`\n📋 Todos los picks seguros:`);
    result.safePicks.forEach(p => {
      console.log(`   • ${p.label}: ${p.confidence}%`);
    });
  }

  console.log('\n✅ Test completado\n');
}

testChampions().catch(console.error);
