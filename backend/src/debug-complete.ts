// Debug completo del flujo de análisis
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

async function debugComplete() {
  console.log('\n🔍 DEBUG COMPLETO DEL FLUJO\n');

  // Simular Arsenal vs Bayer Leverkusen
  const arsenalGoals = { goalsFor: 59, goalsAgainst: 22, played: 29 };
  const leverkusenGoals = { goalsFor: 48, goalsAgainst: 32, played: 24 };

  const arsenalAvgGF = arsenalGoals.goalsFor / arsenalGoals.played;
  const arsenalAvgGA = arsenalGoals.goalsAgainst / arsenalGoals.played;
  const leverkusenAvgGF = leverkusenGoals.goalsFor / leverkusenGoals.played;
  const leverkusenAvgGA = leverkusenGoals.goalsAgainst / leverkusenGoals.played;

  console.log('📊 Arsenal:');
  console.log(`   avgGoalsFor: ${arsenalAvgGF.toFixed(3)}`);
  console.log(`   avgGoalsAgainst: ${arsenalAvgGA.toFixed(3)}`);

  console.log('\n📊 Bayer Leverkusen:');
  console.log(`   avgGoalsFor: ${leverkusenAvgGF.toFixed(3)}`);
  console.log(`   avgGoalsAgainst: ${leverkusenAvgGA.toFixed(3)}`);

  // Calcular lambdas
  const lambdaHome = (leverkusenAvgGF / LEAGUE_AVG_GOALS) * (arsenalAvgGA / LEAGUE_AVG_GOALS) * LEAGUE_AVG_GOALS * 1.1;
  const lambdaAway = (arsenalAvgGF / LEAGUE_AVG_GOALS) * (leverkusenAvgGA / LEAGUE_AVG_GOALS) * LEAGUE_AVG_GOALS;

  console.log('\n🔢 Lambdas:');
  console.log(`   lambdaHome (Leverkusen): ${lambdaHome.toFixed(3)}`);
  console.log(`   lambdaAway (Arsenal): ${lambdaAway.toFixed(3)}`);

  // Matriz de Poisson
  const matrix: number[][] = [];
  for (let h = 0; h <= 5; h++) {
    matrix[h] = [];
    for (let a = 0; a <= 5; a++) {
      matrix[h][a] = poisson(lambdaHome, h) * poisson(lambdaAway, a);
    }
  }

  // Calcular probabilidades
  let probHomeWin = 0, probDraw = 0, probAwayWin = 0;
  let probOver15 = 0, probOver25 = 0, probUnder25 = 0, probUnder35 = 0, probUnder45 = 0, probBTTS = 0;

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = matrix[h][a];
      if (h > a) probHomeWin += p;
      else if (h === a) probDraw += p;
      else probAwayWin += p;
      if (h + a > 1.5) probOver15 += p;
      if (h + a > 2.5) probOver25 += p;
      if (h + a < 2.5) probUnder25 += p;
      if (h + a < 3.5) probUnder35 += p;
      if (h + a < 4.5) probUnder45 += p;
      if (h >= 1 && a >= 1) probBTTS += p;
    }
  }

  console.log('\n📊 RESULTADOS POISSON:');
  console.log(`   probHomeWin: ${(probHomeWin * 100).toFixed(1)}%`);
  console.log(`   probDraw: ${(probDraw * 100).toFixed(1)}%`);
  console.log(`   probAwayWin: ${(probAwayWin * 100).toFixed(1)}%`);
  console.log(`   probOver15: ${(probOver15 * 100).toFixed(1)}%`);
  console.log(`   probOver25: ${(probOver25 * 100).toFixed(1)}%`);
  console.log(`   probUnder35: ${(probUnder35 * 100).toFixed(1)}%`);
  console.log(`   probUnder45: ${(probUnder45 * 100).toFixed(1)}%`);
  console.log(`   probBTTS: ${(probBTTS * 100).toFixed(1)}%`);
  console.log(`   probBTTS_NO: ${((1 - probBTTS) * 100).toFixed(1)}%`);

  // Verificar suma total
  let total = 0;
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      total += matrix[h][a];
    }
  }
  console.log(`\n   Total matriz: ${(total * 100).toFixed(1)}%`);

  // Matriz de probabilidades
  console.log('\n📐 Matriz de probabilidades (top 5):');
  const probs: {h: number, a: number, p: number}[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      probs.push({h, a, p: matrix[h][a]});
    }
  }
  probs.sort((x, y) => y.p - x.p);
  for (const {h, a, p} of probs.slice(0, 5)) {
    console.log(`   ${h}-${a}: ${(p * 100).toFixed(1)}%`);
  }

  console.log('\n✅ Debug completado\n');
}

debugComplete().catch(console.error);
