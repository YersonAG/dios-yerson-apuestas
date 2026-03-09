// Test con datos REALES de ESPN para Atalanta vs Bayern

const TEAM_STYLE_FACTORS = {
  'atalanta': 1.12, 'atalanta bergamo': 1.12,
  'bayern munich': 1.18, 'bayern': 1.18,
};

const LEAGUE_FACTOR = 1.25;
const HOME_ADVANTAGE = 1.05;
const KNOCKOUT_FACTOR = 0.85;

// Datos REALES de ESPN
const atalanta = { gf: 10, ga: 10, played: 8, position: 15 };
const bayern = { gf: 22, ga: 8, played: 8, position: 2 };

function factorial(n) { if (n <= 1) return 1; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function poissonProb(lambda, k) { return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k); }

function getTeamStyleFactor(name) {
  const n = name.toLowerCase();
  return TEAM_STYLE_FACTORS[n] || 1.0;
}

function calcLambda(home, away, homeName, awayName) {
  const homeStyle = getTeamStyleFactor(homeName);
  const awayStyle = getTeamStyleFactor(awayName);
  
  const adjHomeGF = (home.gf / home.played) * homeStyle;
  const adjHomeGA = (home.ga / home.played) * homeStyle;
  const adjAwayGF = (away.gf / away.played) * awayStyle;
  const adjAwayGA = (away.ga / away.played) * awayStyle;
  
  const attackHome = adjHomeGF / LEAGUE_FACTOR;
  const defenseHome = adjHomeGA / LEAGUE_FACTOR;
  const attackAway = adjAwayGF / LEAGUE_FACTOR;
  const defenseAway = adjAwayGA / LEAGUE_FACTOR;
  
  let lambdaHome = attackHome * defenseAway * LEAGUE_FACTOR * HOME_ADVANTAGE * KNOCKOUT_FACTOR;
  let lambdaAway = attackAway * defenseHome * LEAGUE_FACTOR * KNOCKOUT_FACTOR;
  
  return { lambdaHome, lambdaAway, homeStyle, awayStyle };
}

function monteCarlo(lh, la) {
  let probs = { over15: 0, over25: 0 };
  const hp = [], ap = [];
  for (let i = 0; i <= 6; i++) { hp.push(poissonProb(lh, i)); ap.push(poissonProb(la, i)); }
  const sumH = hp.reduce((a, b) => a + b, 0);
  const sumA = ap.reduce((a, b) => a + b, 0);
  for (let i = 0; i <= 6; i++) { hp[i] /= sumH; ap[i] /= sumA; }
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const p = hp[h] * ap[a];
      if (h + a > 1.5) probs.over15 += p;
      if (h + a > 2.5) probs.over25 += p;
    }
  }
  return probs;
}

function logisticCalibration(p) {
  if (p <= 0 || p >= 1) return p;
  const logOdds = Math.log(p / (1 - p));
  return 1 / (1 + Math.exp(-(0.92 * logOdds - 0.03)));
}

function calibrarProbabilidad(prob, volatility, posDiff, pickType) {
  let calibrated = logisticCalibration(prob);
  let factor = 1.0;
  if (posDiff <= 2) factor *= 0.88;
  else if (posDiff <= 4) factor *= 0.94;
  if (volatility > 50) factor *= 0.92;
  else if (volatility > 35) factor *= 0.96;
  calibrated *= factor;
  
  const isTotal = pickType.includes('OVER') || pickType.includes('UNDER');
  const maxProb = isTotal ? (posDiff > 10 ? 0.88 : 0.82) : (posDiff > 10 ? 0.80 : 0.72);
  return Math.min(calibrated, maxProb);
}

function calcularConfianza(prob, elo, form, vol, posDiff, pickType) {
  const calibrated = calibrarProbabilidad(prob, vol, posDiff, pickType);
  const penalty = vol * 0.18 / 100;
  const isTotal = pickType.includes('OVER') || pickType.includes('UNDER');
  
  let conf;
  if (isTotal) {
    conf = calibrated * 0.70 + elo * 0.15 + form * 0.15 - penalty;
  } else {
    conf = calibrated * 0.50 + elo * 0.28 + form * 0.22 - penalty;
  }
  
  let maxC = isTotal ? (posDiff <= 7 ? 85 : 92) : (posDiff <= 7 ? 78 : 85);
  conf = Math.min(conf * 100, maxC);
  return Math.round(Math.min(isTotal ? 92 : 85, conf));
}

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║     ATALANTA vs BAYERN MUNICH - Análisis Motor v6.4e             ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const r = calcLambda(atalanta, bayern, 'atalanta', 'bayern munich');
const mc = monteCarlo(r.lambdaHome, r.lambdaAway);
const posDiff = Math.abs(atalanta.position - bayern.position);
const volatility = 45; // Estimado

console.log('📊 DATOS ESPN:');
console.log(`   Atalanta: ${atalanta.gf} GF, ${atalanta.ga} GA, Pos #${atalanta.position}`);
console.log(`   Bayern:   ${bayern.gf} GF, ${bayern.ga} GA, Pos #${bayern.position}`);
console.log(`\n🎨 STYLE FACTORS:`);
console.log(`   Atalanta: ${r.homeStyle} (OFENSIVO)`);
console.log(`   Bayern:   ${r.awayStyle} (MUY OFENSIVO)`);
console.log(`\n🧮 CÁLCULO:`);
console.log(`   λ Atalanta: ${r.lambdaHome.toFixed(2)}`);
console.log(`   λ Bayern:   ${r.lambdaAway.toFixed(2)}`);
console.log(`   xG Total:  ${(r.lambdaHome + r.lambdaAway).toFixed(2)}`);
console.log(`\n🎲 PROBABILIDADES:`);
console.log(`   OVER 1.5: ${(mc.over15 * 100).toFixed(1)}%`);
console.log(`   OVER 2.5: ${(mc.over25 * 100).toFixed(1)}%`);

// Calcular confianza
const golesPromedio = 2.5;
const over15_conf = calcularConfianza(mc.over15, 0.5, Math.min(1, golesPromedio/4), volatility, posDiff, 'OVER_15');
const over25_conf = calcularConfianza(mc.over25, 0.5, Math.min(1, golesPromedio/5), volatility, posDiff, 'OVER_25');

console.log(`\n📈 CONFIANZA CALCULADA (posDiff=${posDiff}, vol=${volatility}):`);
console.log(`   OVER 1.5: ${over15_conf}%`);
console.log(`   OVER 2.5: ${over25_conf}%`);

console.log(`\n🏆 PICK RECOMENDADO:`);
if (over15_conf >= 65) {
  console.log(`   ✅ OVER 1.5 (${over15_conf}%) - MÁS SEGURO`);
} else if (over25_conf >= 65) {
  console.log(`   ✅ OVER 2.5 (${over25_conf}%)`);
} else {
  console.log(`   ⚠️  Ninguno pasa el filtro 65%`);
}
console.log('');
