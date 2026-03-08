// Debug del cálculo de Poisson para Champions League
import { getUpcomingMatches } from './lib/football-api';
import { getGoalsFromESPNStandings, TEAM_TO_NATIONAL_LEAGUE } from './lib/ai-betting-engine';

const LEAGUE_AVG_GOALS = 1.35;

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poisson(lambda: number, k: number): number {
  return (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / factorial(k);
}

async function debugPoisson() {
  console.log('\n🧮 DEBUG: Cálculo de Poisson para Champions League\n');

  // Datos reales de Arsenal vs Bayer Leverkusen
  const arsenalGoals = { goalsFor: 59, goalsAgainst: 22, played: 29 };
  const leverkusenGoals = { goalsFor: 48, goalsAgainst: 32, played: 24 };

  const arsenalAvgGF = arsenalGoals.goalsFor / arsenalGoals.played;
  const arsenalAvgGA = arsenalGoals.goalsAgainst / arsenalGoals.played;
  const leverkusenAvgGF = leverkusenGoals.goalsFor / leverkusenGoals.played;
  const leverkusenAvgGA = leverkusenGoals.goalsAgainst / leverkusenGoals.played;

  console.log('📊 Arsenal:');
  console.log(`   Goles a favor: ${arsenalGoals.goalsFor} (${arsenalAvgGF.toFixed(2)}/partido)`);
  console.log(`   Goles en contra: ${arsenalGoals.goalsAgainst} (${arsenalAvgGA.toFixed(2)}/partido)`);

  console.log('\n📊 Bayer Leverkusen:');
  console.log(`   Goles a favor: ${leverkusenGoals.goalsFor} (${leverkusenAvgGF.toFixed(2)}/partido)`);
  console.log(`   Goles en contra: ${leverkusenGoals.goalsAgainst} (${leverkusenAvgGA.toFixed(2)}/partido)`);

  // Calcular lambda (goles esperados)
  // Local: Leverkusen
  // Visitante: Arsenal
  const lambdaHome = (leverkusenAvgGF / LEAGUE_AVG_GOALS) * (arsenalAvgGA / LEAGUE_AVG_GOALS) * LEAGUE_AVG_GOALS * 1.1;
  const lambdaAway = (arsenalAvgGF / LEAGUE_AVG_GOALS) * (leverkusenAvgGA / LEAGUE_AVG_GOALS) * LEAGUE_AVG_GOALS;

  console.log('\n🔢 Lambdas (goles esperados):');
  console.log(`   Lambda Local (Leverkusen): ${lambdaHome.toFixed(3)}`);
  console.log(`   Lambda Visitante (Arsenal): ${lambdaAway.toFixed(3)}`);

  // Construir matriz
  console.log('\n📐 Matriz de probabilidades:');
  let total = 0;
  let btts = 0;
  let over15 = 0;
  let under35 = 0;

  const matrix: number[][] = [];
  for (let h = 0; h <= 5; h++) {
    matrix[h] = [];
    for (let a = 0; a <= 5; a++) {
      const p = poisson(lambdaHome, h) * poisson(lambdaAway, a);
      matrix[h][a] = p;
      total += p;
      if (h >= 1 && a >= 1) btts += p;
      if (h + a > 1.5) over15 += p;
      if (h + a < 3.5) under35 += p;
    }
  }

  // Mostrar matriz
  console.log('\n   Marcador | Probabilidad');
  console.log('   --------|------------');
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      if (matrix[h][a] > 0.01) {
        console.log(`   ${h}-${a}     | ${(matrix[h][a] * 100).toFixed(1)}%`);
      }
    }
  }

  console.log('\n📊 Resultados:');
  console.log(`   Total suma matriz: ${(total * 100).toFixed(1)}%`);
  console.log(`   BTTS (ambos anotan): ${(btts * 100).toFixed(1)}%`);
  console.log(`   BTTS_NO (no anotan ambos): ${((1 - btts) * 100).toFixed(1)}%`);
  console.log(`   Over 1.5: ${(over15 * 100).toFixed(1)}%`);
  console.log(`   Under 3.5: ${(under35 * 100).toFixed(1)}%`);

  // Verificar si los valores son correctos
  console.log('\n✅ Conclusión:');
  if (btts < 0.01) {
    console.log('   ❌ ERROR: BTTS es casi 0, revisar lambdas');
    console.log('   Lambda muy bajo = el modelo espera muy pocos goles');
  } else {
    console.log('   ✅ BTTS calculado correctamente');
  }
}

debugPoisson().catch(console.error);
