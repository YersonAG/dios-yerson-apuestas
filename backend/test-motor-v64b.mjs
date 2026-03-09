// Test Motor v6.4 - Style Factor aplicado a DATOS DE ENTRADA

const TEAM_STYLE_FACTORS = {
  'atletico madrid': 0.75, 'atlético madrid': 0.75, 'atletico': 0.75,
  'newcastle united': 0.80, 'newcastle': 0.80,
  'tottenham': 1.08, 'tottenham hotspur': 1.08, 'spurs': 1.08,
  'barcelona': 1.08, 'barca': 1.08,
};

const LEAGUE_FACTOR = 1.25;
const HOME_ADVANTAGE = 1.05;

// Datos de ESPN Champions League (INFLADOS)
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

function calcLambdaV64_CORREGIDO(home, away, homeName, awayName) {
  // 🆕 Aplicar Style Factor a los DATOS DE ENTRADA
  // Esto ajusta los goles "reales" basado en el estilo histórico del equipo
  const homeStyleFactor = getTeamStyleFactor(homeName);
  const awayStyleFactor = getTeamStyleFactor(awayName);
  
  // Ajustar goles basado en estilo: defensivo = reduce goles esperados
  const adjustedHomeGF = home.gf * homeStyleFactor;
  const adjustedHomeGA = home.ga * homeStyleFactor; // Defensivo también recibe menos
  const adjustedAwayGF = away.gf * awayStyleFactor;
  const adjustedAwayGA = away.ga * awayStyleFactor;
  
  const avgGoalsForHome = adjustedHomeGF / home.played;
  const avgGoalsAgainstHome = adjustedHomeGA / home.played;
  const avgGoalsForAway = adjustedAwayGF / away.played;
  const avgGoalsAgainstAway = adjustedAwayGA / away.played;
  
  const attackHome = avgGoalsForHome / LEAGUE_FACTOR;
  const defenseAway = avgGoalsAgainstAway / LEAGUE_FACTOR;
  const attackAway = avgGoalsForAway / LEAGUE_FACTOR;
  const defenseHome = avgGoalsAgainstHome / LEAGUE_FACTOR;
  
  let lambdaHome = attackHome * defenseAway * LEAGUE_FACTOR * HOME_ADVANTAGE;
  let lambdaAway = attackAway * defenseHome * LEAGUE_FACTOR;
  
  return { 
    lambdaHome, lambdaAway, 
    homeStyleFactor, awayStyleFactor,
    avgHomeGF: avgGoalsForHome, avgAwayGF: avgGoalsForAway
  };
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
console.log('║       MOTOR v6.4 CORREGIDO - Style Factor en ENTRADA    ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log('=== PARTIDO 1: Atlético Madrid vs Tottenham ===');
const atleti = rawTeams['atletico madrid'];
const spurs = rawTeams['tottenham hotspur'];
const r1 = calcLambdaV64_CORREGIDO(atleti, spurs, 'atletico madrid', 'tottenham hotspur');

console.log(`\n📊 Datos ESPN (INFLADOS):`);
console.log(`   Atlético: ${atleti.gf} GF, ${atleti.ga} GA en ${atleti.played} partidos`);
console.log(`   Tottenham: ${spurs.gf} GF, ${spurs.ga} GA en ${spurs.played} partidos`);

console.log(`\n📋 Team Style Factors:`);
console.log(`   Atlético Madrid: ${r1.homeStyleFactor.toFixed(2)} (MUY defensivo → reduce goles 25%)`);
console.log(`   Tottenham: ${r1.awayStyleFactor.toFixed(2)} (ofensivo → aumenta goles 8%)`);

console.log(`\n📊 Datos AJUSTADOS por Style:`);
console.log(`   Atlético: ${(atleti.gf * r1.homeStyleFactor).toFixed(1)} GF → ${r1.avgHomeGF.toFixed(2)} por partido`);
console.log(`   Tottenham: ${(spurs.gf * r1.awayStyleFactor).toFixed(1)} GF → ${r1.avgAwayGF.toFixed(2)} por partido`);

console.log(`\n🎯 xG Calculado:`);
console.log(`   λHome (Atlético): ${r1.lambdaHome.toFixed(2)}`);
console.log(`   λAway (Tottenham): ${r1.lambdaAway.toFixed(2)}`);
console.log(`   xG Total: ${(r1.lambdaHome + r1.lambdaAway).toFixed(2)}`);

const mc1 = monteCarlo(r1.lambdaHome, r1.lambdaAway);
console.log(`\n🎲 Probabilidades:`);
console.log(`   OVER 2.5:  ${(mc1.over25 * 100).toFixed(1)}%`);
console.log(`   UNDER 2.5: ${(mc1.under25 * 100).toFixed(1)}%`);

console.log('\n\n=== PARTIDO 2: Newcastle vs Barcelona ===');
const newcastle = rawTeams['newcastle united'];
const barca = rawTeams['barcelona'];
const r2 = calcLambdaV64_CORREGIDO(newcastle, barca, 'newcastle united', 'barcelona');

console.log(`\n📊 Datos ESPN (INFLADOS):`);
console.log(`   Newcastle: ${newcastle.gf} GF, ${newcastle.ga} GA en ${newcastle.played} partidos`);
console.log(`   Barcelona: ${barca.gf} GF, ${barca.ga} GA en ${barca.played} partidos`);

console.log(`\n📋 Team Style Factors:`);
console.log(`   Newcastle: ${r2.homeStyleFactor.toFixed(2)} (defensivo → reduce goles 20%)`);
console.log(`   Barcelona: ${r2.awayStyleFactor.toFixed(2)} (ofensivo → aumenta goles 8%)`);

console.log(`\n📊 Datos AJUSTADOS por Style:`);
console.log(`   Newcastle: ${(newcastle.gf * r2.homeStyleFactor).toFixed(1)} GF → ${r2.avgHomeGF.toFixed(2)} por partido`);
console.log(`   Barcelona: ${(barca.gf * r2.awayStyleFactor).toFixed(1)} GF → ${r2.avgAwayGF.toFixed(2)} por partido`);

console.log(`\n🎯 xG Calculado:`);
console.log(`   λHome (Newcastle): ${r2.lambdaHome.toFixed(2)}`);
console.log(`   λAway (Barcelona): ${r2.lambdaAway.toFixed(2)}`);
console.log(`   xG Total: ${(r2.lambdaHome + r2.lambdaAway).toFixed(2)}`);

const mc2 = monteCarlo(r2.lambdaHome, r2.lambdaAway);
console.log(`\n🎲 Probabilidades:`);
console.log(`   OVER 2.5:  ${(mc2.over25 * 100).toFixed(1)}%`);
console.log(`   UNDER 2.5: ${(mc2.under25 * 100).toFixed(1)}%`);

console.log('\n\n╔══════════════════════════════════════════════════════════╗');
console.log('║                  RESUMEN FINAL v6.4                     ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║ Partido                    │ xG v6.4 │ OVER   │ UNDER  ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║ Atlético vs Tottenham      │  ' + (r1.lambdaHome + r1.lambdaAway).toFixed(2) + '  │ ' + (mc1.over25 * 100).toFixed(0).padStart(3) + '%  │ ' + (mc1.under25 * 100).toFixed(0).padStart(3) + '%  ║');
console.log('║ Newcastle vs Barcelona     │  ' + (r2.lambdaHome + r2.lambdaAway).toFixed(2) + '  │ ' + (mc2.over25 * 100).toFixed(0).padStart(3) + '%  │ ' + (mc2.under25 * 100).toFixed(0).padStart(3) + '%  ║');
console.log('╚══════════════════════════════════════════════════════════╝');

console.log('\n🎯 PICK RECOMENDADO v6.4:');
console.log(`   Atlético vs Tottenham: ${mc1.under25 > 0.45 ? 'UNDER 2.5 o UNDER 3.5' : 'OVER 1.5 (más seguro)'}`);
console.log(`   Newcastle vs Barcelona: ${mc2.under25 > 0.45 ? 'UNDER 2.5 o UNDER 3.5' : 'OVER 1.5 (más seguro)'}`);
console.log('');
