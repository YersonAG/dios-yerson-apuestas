// Test Motor v6.4b Final - Style Factors + Knockout Factor

const TEAM_STYLE_FACTORS = {
  'atletico madrid': 0.75, 'atlético madrid': 0.75, 'atletico': 0.75,
  'newcastle united': 0.80, 'newcastle': 0.80,
  'tottenham': 1.08, 'tottenham hotspur': 1.08, 'spurs': 1.08,
  'barcelona': 1.08, 'barca': 1.08,
};

// v6.4: Factor Champions League REDUCIDO
const LEAGUE_FACTOR = 1.25;
const HOME_ADVANTAGE = 1.05;
// v6.4b: Knockout Factor
const KNOCKOUT_FACTOR = 0.85;

const rawTeams = {
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

function calcLambdaV64b(home, away, homeName, awayName) {
  const homeStyleFactor = getTeamStyleFactor(homeName);
  const awayStyleFactor = getTeamStyleFactor(awayName);
  
  // Ajustar datos de entrada
  const adjustedAvgGoalsForHome = (home.gf / home.played) * homeStyleFactor;
  const adjustedAvgGoalsAgainstHome = (home.ga / home.played) * homeStyleFactor;
  const adjustedAvgGoalsForAway = (away.gf / away.played) * awayStyleFactor;
  const adjustedAvgGoalsAgainstAway = (away.ga / away.played) * awayStyleFactor;
  
  // Attack/Defense
  const attackHome = adjustedAvgGoalsForHome / LEAGUE_FACTOR;
  const defenseHome = adjustedAvgGoalsAgainstHome / LEAGUE_FACTOR;
  const attackAway = adjustedAvgGoalsForAway / LEAGUE_FACTOR;
  const defenseAway = adjustedAvgGoalsAgainstAway / LEAGUE_FACTOR;
  
  // Lambda
  let lambdaHome = attackHome * defenseAway * LEAGUE_FACTOR * HOME_ADVANTAGE;
  let lambdaAway = attackAway * defenseHome * LEAGUE_FACTOR;
  
  // Knockout Factor
  lambdaHome *= KNOCKOUT_FACTOR;
  lambdaAway *= KNOCKOUT_FACTOR;
  
  return { 
    lambdaHome, lambdaAway, 
    homeStyleFactor, awayStyleFactor,
    adjustedAvgGoalsForHome, adjustedAvgGoalsAgainstHome,
    adjustedAvgGoalsForAway, adjustedAvgGoalsAgainstAway
  };
}

function monteCarlo(lambdaHome, lambdaAway) {
  let over15 = 0, over25 = 0, over35 = 0, under25 = 0, under35 = 0;
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
      const total = h + a;
      if (total > 1.5) over15 += prob;
      if (total > 2.5) over25 += prob;
      if (total > 3.5) over35 += prob;
      if (total < 2.5) under25 += prob;
      if (total < 3.5) under35 += prob;
    }
  }
  
  return { over15, over25, over35, under25, under35 };
}

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║         MOTOR v6.4b - Style Factors + Knockout Factor             ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log('═════════════════════════════════════════════════════════════════════');
console.log('  PARTIDO 1: Atlético Madrid vs Tottenham Hotspur (Champions League)');
console.log('═════════════════════════════════════════════════════════════════════');
const atleti = rawTeams['atletico madrid'];
const spurs = rawTeams['tottenham hotspur'];
const r1 = calcLambdaV64b(atleti, spurs, 'atletico madrid', 'tottenham hotspur');

console.log(`\n📊 Datos RAW ESPN Champions League:`);
console.log(`   Atlético: ${atleti.gf} GF, ${atleti.ga} GA (${atleti.played} partidos)`);
console.log(`   Tottenham: ${spurs.gf} GF, ${spurs.ga} GA (${spurs.played} partidos)`);

console.log(`\n🎨 Team Style Factors (v6.4):`);
console.log(`   Atlético Madrid: ${r1.homeStyleFactor.toFixed(2)} ← MUY defensivo (Simeone)`);
console.log(`   Tottenham: ${r1.awayStyleFactor.toFixed(2)} ← Ofensivo (Ange)`);

console.log(`\n📊 Datos AJUSTADOS:`);
console.log(`   Atlético: ${(r1.adjustedAvgGoalsForHome).toFixed(2)} GF/pg, ${(r1.adjustedAvgGoalsAgainstHome).toFixed(2)} GA/pg`);
console.log(`   Tottenham: ${(r1.adjustedAvgGoalsForAway).toFixed(2)} GF/pg, ${(r1.adjustedAvgGoalsAgainstAway).toFixed(2)} GA/pg`);

console.log(`\n🎯 xG Calculado (con Knockout Factor -15%):`);
console.log(`   λHome (Atlético): ${r1.lambdaHome.toFixed(2)}`);
console.log(`   λAway (Tottenham): ${r1.lambdaAway.toFixed(2)}`);
console.log(`   xG Total: ${(r1.lambdaHome + r1.lambdaAway).toFixed(2)}`);

const mc1 = monteCarlo(r1.lambdaHome, r1.lambdaAway);
console.log(`\n🎲 Probabilidades:`);
console.log(`   OVER 1.5: ${(mc1.over15 * 100).toFixed(1)}%`);
console.log(`   OVER 2.5: ${(mc1.over25 * 100).toFixed(1)}%`);
console.log(`   OVER 3.5: ${(mc1.over35 * 100).toFixed(1)}%`);
console.log(`   UNDER 2.5: ${(mc1.under25 * 100).toFixed(1)}%`);
console.log(`   UNDER 3.5: ${(mc1.under35 * 100).toFixed(1)}%`);

console.log('\n═════════════════════════════════════════════════════════════════════');
console.log('  PARTIDO 2: Newcastle United vs Barcelona (Champions League)');
console.log('═════════════════════════════════════════════════════════════════════');
const newcastle = rawTeams['newcastle united'];
const barca = rawTeams['barcelona'];
const r2 = calcLambdaV64b(newcastle, barca, 'newcastle united', 'barcelona');

console.log(`\n📊 Datos RAW ESPN Champions League:`);
console.log(`   Newcastle: ${newcastle.gf} GF, ${newcastle.ga} GA (${newcastle.played} partidos)`);
console.log(`   Barcelona: ${barca.gf} GF, ${barca.ga} GA (${barca.played} partidos)`);

console.log(`\n🎨 Team Style Factors (v6.4):`);
console.log(`   Newcastle: ${r2.homeStyleFactor.toFixed(2)} ← Defensivo (Howe)`);
console.log(`   Barcelona: ${r2.awayStyleFactor.toFixed(2)} ← Ofensivo`);

console.log(`\n📊 Datos AJUSTADOS:`);
console.log(`   Newcastle: ${(r2.adjustedAvgGoalsForHome).toFixed(2)} GF/pg, ${(r2.adjustedAvgGoalsAgainstHome).toFixed(2)} GA/pg`);
console.log(`   Barcelona: ${(r2.adjustedAvgGoalsForAway).toFixed(2)} GF/pg, ${(r2.adjustedAvgGoalsAgainstAway).toFixed(2)} GA/pg`);

console.log(`\n🎯 xG Calculado (con Knockout Factor -15%):`);
console.log(`   λHome (Newcastle): ${r2.lambdaHome.toFixed(2)}`);
console.log(`   λAway (Barcelona): ${r2.lambdaAway.toFixed(2)}`);
console.log(`   xG Total: ${(r2.lambdaHome + r2.lambdaAway).toFixed(2)}`);

const mc2 = monteCarlo(r2.lambdaHome, r2.lambdaAway);
console.log(`\n🎲 Probabilidades:`);
console.log(`   OVER 1.5: ${(mc2.over15 * 100).toFixed(1)}%`);
console.log(`   OVER 2.5: ${(mc2.over25 * 100).toFixed(1)}%`);
console.log(`   OVER 3.5: ${(mc2.over35 * 100).toFixed(1)}%`);
console.log(`   UNDER 2.5: ${(mc2.under25 * 100).toFixed(1)}%`);
console.log(`   UNDER 3.5: ${(mc2.under35 * 100).toFixed(1)}%`);

console.log('\n\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                     COMPARATIVA FINAL                              ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log('║ Partido                    │ v6.3 xG │ v6.4b xG │ PICK v6.4b    ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');

// Determinar mejor pick
const pick1 = mc1.over15 > 0.65 ? 'OVER 1.5' : (mc1.under35 > 0.60 ? 'UNDER 3.5' : 'ANÁLISIS');
const pick2 = mc2.over15 > 0.65 ? 'OVER 1.5' : (mc2.under35 > 0.60 ? 'UNDER 3.5' : 'ANÁLISIS');

console.log(`║ Atlético vs Tottenham      │  4.18   │  ${(r1.lambdaHome + r1.lambdaAway).toFixed(2)}   │ ${pick1.padEnd(13)} ║`);
console.log(`║ Newcastle vs Barcelona     │  4.44   │  ${(r2.lambdaHome + r2.lambdaAway).toFixed(2)}   │ ${pick2.padEnd(13)} ║`);
console.log('╚═══════════════════════════════════════════════════════════════════╝');

console.log('\n🎯 PICKS RECOMENDADOS v6.4b:');
console.log(`   Atlético vs Tottenham: ${pick1} (${mc1.over15 > 0.65 ? (mc1.over15 * 100).toFixed(0) + '%' : (mc1.under35 * 100).toFixed(0) + '%'} confianza)`);
console.log(`   Newcastle vs Barcelona: ${pick2} (${mc2.over15 > 0.65 ? (mc2.over15 * 100).toFixed(0) + '%' : (mc2.under35 * 100).toFixed(0) + '%'} confianza)`);
console.log('');
