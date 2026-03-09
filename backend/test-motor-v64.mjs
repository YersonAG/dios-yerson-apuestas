// Test Motor v6.4 con Team Style Factors

const TEAM_STYLE_FACTORS = {
  'atletico madrid': 0.75, 'atlético madrid': 0.75, 'atletico': 0.75,
  'newcastle united': 0.80, 'newcastle': 0.80,
  'tottenham': 1.08, 'tottenham hotspur': 1.08, 'spurs': 1.08,
  'barcelona': 1.08, 'barca': 1.08,
};

// CORREGIDO: Factor Champions League reducido
const LEAGUE_FACTOR = 1.25; // Antes 1.42
const HOME_ADVANTAGE = 1.05;

const teams = {
  'atletico madrid': { gf: 17, ga: 15, played: 8, position: 14 },
  'tottenham hotspur': { gf: 17, ga: 7, played: 8, position: 4 },
  'newcastle united': { gf: 17, ga: 7, played: 8, position: 12 },
  'barcelona': { gf: 22, ga: 14, played: 8, position: 5 },
};

function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonProb(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function getTeamStyleFactor(teamName) {
  const normalized = teamName.toLowerCase().trim();
  if (TEAM_STYLE_FACTORS[normalized]) return TEAM_STYLE_FACTORS[normalized];
  for (const [key, factor] of Object.entries(TEAM_STYLE_FACTORS)) {
    if (normalized.includes(key) || key.includes(normalized)) return factor;
  }
  return 1.0;
}

function calcLambdaV64(home, away, homeName, awayName) {
  const avgGoalsForHome = home.gf / home.played;
  const avgGoalsAgainstHome = home.ga / home.played;
  const avgGoalsForAway = away.gf / away.played;
  const avgGoalsAgainstAway = away.ga / away.played;
  
  const attackHome = avgGoalsForHome / LEAGUE_FACTOR;
  const defenseAway = avgGoalsAgainstAway / LEAGUE_FACTOR;
  const attackAway = avgGoalsForAway / LEAGUE_FACTOR;
  const defenseHome = avgGoalsAgainstHome / LEAGUE_FACTOR;
  
  let lambdaHome = attackHome * defenseAway * LEAGUE_FACTOR * HOME_ADVANTAGE;
  let lambdaAway = attackAway * defenseHome * LEAGUE_FACTOR;
  
  // 🆕 v6.4: Team Style Factors
  const homeStyleFactor = getTeamStyleFactor(homeName);
  const awayStyleFactor = getTeamStyleFactor(awayName);
  const combinedStyleFactor = Math.sqrt(homeStyleFactor * awayStyleFactor);
  
  lambdaHome *= combinedStyleFactor;
  lambdaAway *= combinedStyleFactor;
  
  return { lambdaHome, lambdaAway, homeStyleFactor, awayStyleFactor, combinedStyleFactor };
}

function monteCarlo(lambdaHome, lambdaAway) {
  let over25 = 0, under25 = 0;
  const homeProbs = [], awayProbs = [];
  
  for (let i = 0; i <= 6; i++) {
    homeProbs.push(poissonProb(lambdaHome, i));
    awayProbs.push(poissonProb(lambdaAway, i));
  }
  
  const sumH = homeProbs.reduce((a, b) => a + b, 0);
  const sumA = awayProbs.reduce((a, b) => a + b, 0);
  for (let i = 0; i <= 6; i++) {
    homeProbs[i] /= sumH;
    awayProbs[i] /= sumA;
  }
  
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob = homeProbs[h] * awayProbs[a];
      if (h + a > 2.5) over25 += prob;
      else under25 += prob;
    }
  }
  
  return { over25, under25 };
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║          MOTOR v6.4 - Team Style Factors               ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log('=== PARTIDO 1: Atlético Madrid vs Tottenham ===');
const atleti = teams['atletico madrid'];
const spurs = teams['tottenham hotspur'];
const r1 = calcLambdaV64(atleti, spurs, 'atletico madrid', 'tottenham hotspur');
console.log(`\n📋 Team Style Factors:`);
console.log(`   Atlético Madrid: ${r1.homeStyleFactor.toFixed(2)} (MUY defensivo)`);
console.log(`   Tottenham: ${r1.awayStyleFactor.toFixed(2)} (ofensivo)`);
console.log(`   Combined: ${r1.combinedStyleFactor.toFixed(2)}`);
console.log(`\n📊 xG Calculado:`);
console.log(`   λHome (Atlético): ${r1.lambdaHome.toFixed(2)}`);
console.log(`   λAway (Tottenham): ${r1.lambdaAway.toFixed(2)}`);
console.log(`   xG Total: ${(r1.lambdaHome + r1.lambdaAway).toFixed(2)}`);
const mc1 = monteCarlo(r1.lambdaHome, r1.lambdaAway);
console.log(`\n🎯 Probabilidades:`);
console.log(`   OVER 2.5:  ${(mc1.over25 * 100).toFixed(1)}%`);
console.log(`   UNDER 2.5: ${(mc1.under25 * 100).toFixed(1)}%`);
console.log(`\n✅ PICK RECOMENDADO: ${mc1.under25 > mc1.over25 ? 'UNDER 2.5' : 'OVER 2.5'} (${Math.max(mc1.under25, mc1.over25) * 100 | 0}%)`);

console.log('\n\n=== PARTIDO 2: Newcastle vs Barcelona ===');
const newcastle = teams['newcastle united'];
const barca = teams['barcelona'];
const r2 = calcLambdaV64(newcastle, barca, 'newcastle united', 'barcelona');
console.log(`\n📋 Team Style Factors:`);
console.log(`   Newcastle: ${r2.homeStyleFactor.toFixed(2)} (defensivo)`);
console.log(`   Barcelona: ${r2.awayStyleFactor.toFixed(2)} (ofensivo)`);
console.log(`   Combined: ${r2.combinedStyleFactor.toFixed(2)}`);
console.log(`\n📊 xG Calculado:`);
console.log(`   λHome (Newcastle): ${r2.lambdaHome.toFixed(2)}`);
console.log(`   λAway (Barcelona): ${r2.lambdaAway.toFixed(2)}`);
console.log(`   xG Total: ${(r2.lambdaHome + r2.lambdaAway).toFixed(2)}`);
const mc2 = monteCarlo(r2.lambdaHome, r2.lambdaAway);
console.log(`\n🎯 Probabilidades:`);
console.log(`   OVER 2.5:  ${(mc2.over25 * 100).toFixed(1)}%`);
console.log(`   UNDER 2.5: ${(mc2.under25 * 100).toFixed(1)}%`);
console.log(`\n✅ PICK RECOMENDADO: ${mc2.under25 > mc2.over25 ? 'UNDER 2.5' : 'OVER 2.5'} (${Math.max(mc2.under25, mc2.over25) * 100 | 0}%)`);

console.log('\n\n╔══════════════════════════════════════════════════════════╗');
console.log('║                COMPARATIVA v6.3 vs v6.4                 ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║ Partido                    │ v6.3 xG │ v6.4 xG │ PICK   ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║ Atlético vs Tottenham      │  4.18   │  ' + (r1.lambdaHome + r1.lambdaAway).toFixed(2) + '  │ ' + (mc1.under25 > mc1.over25 ? 'UNDER ✅' : 'OVER  ❌') + '  ║');
console.log('║ Newcastle vs Barcelona     │  4.44   │  ' + (r2.lambdaHome + r2.lambdaAway).toFixed(2) + '  │ ' + (mc2.under25 > mc2.over25 ? 'UNDER ✅' : 'OVER  ❌') + '  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');
