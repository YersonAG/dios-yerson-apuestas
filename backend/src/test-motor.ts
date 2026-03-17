// Test rápido del Motor v5.0
import { getUpcomingMatches } from './lib/football-api';
import { analyzeMatchAsync, generateCombinadaFromMatchesAsync } from './lib/ai-betting-engine';

async function test() {
  console.log('\n🧪 TEST MOTOR v5.0\n');

  // 1. Obtener partidos
  console.log('1️⃣ Obteniendo partidos de ESPN...');
  const matches = await getUpcomingMatches(7);
  console.log(`   ✅ ${matches.length} partidos encontrados\n`);

  if (matches.length === 0) {
    console.log('❌ No hay partidos');
    return;
  }

  // 2. Mostrar algunos partidos
  console.log('2️⃣ Primeros 5 partidos:');
  matches.slice(0, 5).forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.league})`);
  });
  console.log('');

  // 3. Analizar un partido
  console.log('3️⃣ Analizando primer partido...');
  const partido = matches[0];
  const result = await analyzeMatchAsync(partido);

  console.log(`\n   🎯 Pick: ${result.pick.label}`);
  console.log(`   📊 Confianza: ${result.pick.confidence}%`);
  console.log(`   📈 Probabilidad: ${(result.pick.probability * 100).toFixed(0)}%`);
  console.log(`   💰 Cuota: ${(1 / result.pick.probability).toFixed(2)}`);
  console.log(`   📉 Riesgo: ${result.riskLevel}`);
  console.log(`   📝 Razón: ${result.pick.reasoning[0]}`);

  console.log(`\n   📋 Picks seguros (>= 65%):`);
  result.safePicks.forEach(p => {
    console.log(`      • ${p.label}: ${p.confidence}%`);
  });

  // 4. Generar combinada
  console.log('\n4️⃣ Generando combinada automática...');
  const combinada = await generateCombinadaFromMatchesAsync(matches.slice(0, 5));

  console.log(`\n   📊 Score promedio: ${combinada.score}/100`);
  console.log(`   🎲 Probabilidad total: ${(combinada.totalProbability * 100).toFixed(0)}%`);
  console.log(`   💰 Cuota total: ${combinada.totalOdds.toFixed(2)}`);
  console.log(`   📍 Picks: ${combinada.picks.length}\n`);

  console.log('   Picks:');
  combinada.picks.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.homeTeam} vs ${p.awayTeam}`);
    console.log(`      → ${p.pick} @ ${p.odds.toFixed(2)} (${p.score}%)`);
  });

  console.log('\n✅ TEST COMPLETADO\n');
}

test().catch(console.error);
