// Test rápido del motor para los partidos problemáticos

const HOME_ADVANTAGE = 1.05; // Champions League

// Stats de Champions League
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

// Calcular lambda
function calcLambda(home, away, leagueFactor) {
  const avgGoalsForHome = home.gf / home.played;
  const avgGoalsAgainstHome = home.ga / home.played;
  const avgGoalsForAway = away.gf / away.played;
  const avgGoalsAgainstAway = away.ga / away.played;
  
  const attackHome = avgGoalsForHome / leagueFactor;
  const defenseAway = avgGoalsAgainstAway / leagueFactor;
  const attackAway = avgGoalsForAway / leagueFactor;
  const defenseHome = avgGoalsAgainstHome / leagueFactor;
  
  let lambdaHome = attackHome * defenseAway * leagueFactor * HOME_ADVANTAGE;
  let lambdaAway = attackAway * defenseHome * leagueFactor;
  
  return { lambdaHome, lambdaAway, attackHome, defenseHome, attackAway, defenseAway };
}

// Monte Carlo simple
function monteCarlo(lambdaHome, lambdaAway, sims = 10000) {
  let over25 = 0;
  const homeProbs = [];
  const awayProbs = [];
  
  for (let i = 0; i <= 6; i++) {
    homeProbs.push(poissonProb(lambdaHome, i));
    awayProbs.push(poissonProb(lambdaAway, i));
  }
  
  // Normalizar
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
    }
  }
  
  return { over25 };
}

console.log('\n=== ANÁLISIS PARTIDO 1: Atlético Madrid vs Tottenham ===');
const atleti = teams['atletico madrid'];
const spurs = teams['tottenham hotspur'];
const result1 = calcLambda(atleti, spurs, 1.42);
console.log(`λHome (Atlético): ${result1.lambdaHome.toFixed(2)}`);
console.log(`λAway (Tottenham): ${result1.lambdaAway.toFixed(2)}`);
console.log(`xG Total: ${(result1.lambdaHome + result1.lambdaAway).toFixed(2)}`);
const mc1 = monteCarlo(result1.lambdaHome, result1.lambdaAway);
console.log(`Prob OVER 2.5: ${(mc1.over25 * 100).toFixed(1)}%`);
console.log(`\nAttack/Defense ratios:`);
console.log(`  Atlético - Attack: ${result1.attackHome.toFixed(2)}, Defense: ${result1.defenseHome.toFixed(2)}`);
console.log(`  Tottenham - Attack: ${result1.attackAway.toFixed(2)}, Defense: ${result1.defenseAway.toFixed(2)}`);

console.log('\n=== ANÁLISIS PARTIDO 2: Newcastle vs Barcelona ===');
const newcastle = teams['newcastle united'];
const barca = teams['barcelona'];
const result2 = calcLambda(newcastle, barca, 1.42);
console.log(`λHome (Newcastle): ${result2.lambdaHome.toFixed(2)}`);
console.log(`λAway (Barcelona): ${result2.lambdaHome.toFixed(2)}`);
console.log(`xG Total: ${(result2.lambdaHome + result2.lambdaAway).toFixed(2)}`);
const mc2 = monteCarlo(result2.lambdaHome, result2.lambdaAway);
console.log(`Prob OVER 2.5: ${(mc2.over25 * 100).toFixed(1)}%`);
console.log(`\nAttack/Defense ratios:`);
console.log(`  Newcastle - Attack: ${result2.attackHome.toFixed(2)}, Defense: ${result2.defenseHome.toFixed(2)}`);
console.log(`  Barcelona - Attack: ${result2.attackAway.toFixed(2)}, Defense: ${result2.defenseAway.toFixed(2)}`);

console.log('\n=== PROBLEMA IDENTIFICADO ===');
console.log('El motor está usando datos de Champions League donde:');
console.log('- Atlético Madrid tiene 17 GF en 8 partidos (2.1/partido)');
console.log('- Newcastle tiene 17 GF en 8 partidos (2.1/partido)');
console.log('');
console.log('PERO esto NO refleja el estilo de juego:');
console.log('- Atlético bajo Simeone = MUY defensivo');
console.log('- Newcastle bajo Howe = MUY defensivo');
console.log('');
console.log('El factor de liga Champions (1.42) está muy alto.');
