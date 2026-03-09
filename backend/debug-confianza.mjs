// Debug: Cálculo de confianza para OVER 1.5 vs OVER 2.5

// Simular la función calibrarProbabilidad
function logisticCalibration(p) {
  if (p <= 0 || p >= 1) return p;
  const a = 0.92;
  const b = -0.03;
  const logOdds = Math.log(p / (1 - p));
  const calibratedLogOdds = a * logOdds + b;
  return 1 / (1 + Math.exp(-calibratedLogOdds));
}

function calibrarProbabilidad(prob, volatility, posDiff) {
  let calibrated = logisticCalibration(prob);
  
  let calibrationFactor = 1.0;
  if (posDiff <= 2) calibrationFactor *= 0.88;
  else if (posDiff <= 4) calibrationFactor *= 0.94;
  
  if (volatility > 50) calibrationFactor *= 0.92;
  else if (volatility > 35) calibrationFactor *= 0.96;
  
  calibrated *= calibrationFactor;
  
  let maxProb = posDiff > 10 ? 0.80 : 0.72;
  return Math.min(calibrated, maxProb);
}

function calcularConfianza(poissonProb, eloProb, formFactor, volatility, posDiff, pickType) {
  const calibratedProb = calibrarProbabilidad(poissonProb, volatility, posDiff);
  const volatilityPenalty = volatility * 0.18 / 100;
  
  let confidence = (
    calibratedProb * 0.50 +
    eloProb * 0.28 +
    formFactor * 0.22
  ) - volatilityPenalty;
  
  const isTotalPick = pickType.includes('OVER') || pickType.includes('UNDER');
  let maxConfidence = 100;
  
  if (isTotalPick) {
    if (posDiff <= 2) maxConfidence = 75;
    else if (posDiff <= 4) maxConfidence = 80;
    else if (posDiff <= 7) maxConfidence = 85;
  } else {
    if (posDiff <= 2) maxConfidence = 68;
    else if (posDiff <= 4) maxConfidence = 72;
    else if (posDiff <= 7) maxConfidence = 78;
  }
  
  confidence = Math.min(confidence * 100, maxConfidence);
  
  const absoluteCap = isTotalPick ? 92 : 85;
  return Math.round(Math.max(0, Math.min(absoluteCap, confidence)));
}

// Newcastle vs Barcelona
const posDiff = 7; // #12 vs #5 = 7
const volatility = 35;
const golesPromedio = 2.5;

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║    DEBUG: Newcastle vs Barcelona - Cálculo de Confianza          ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');

// OVER 1.5
const over15_prob = 0.88;
const over15_conf = calcularConfianza(over15_prob, 0.5, Math.min(1, golesPromedio/4), volatility, posDiff, 'OVER_15');
console.log(`║  OVER 1.5:                                                         ║`);
console.log(`║    Probabilidad Monte Carlo: ${(over15_prob * 100).toFixed(1)}%                                ║`);
console.log(`║    ELO Factor: 0.5, Form Factor: ${Math.min(1, golesPromedio/4).toFixed(2)}                          ║`);
console.log(`║    Volatilidad: ${volatility}%, posDiff: ${posDiff}                                   ║`);
console.log(`║    CONFIANZA FINAL: ${over15_conf}%                                          ║`);

// OVER 2.5
const over25_prob = 0.71;
const over25_conf = calcularConfianza(over25_prob, 0.5, Math.min(1, golesPromedio/5), volatility, posDiff, 'OVER_25');
console.log(`║                                                                    ║`);
console.log(`║  OVER 2.5:                                                         ║`);
console.log(`║    Probabilidad Monte Carlo: ${(over25_prob * 100).toFixed(1)}%                                ║`);
console.log(`║    ELO Factor: 0.5, Form Factor: ${Math.min(1, golesPromedio/5).toFixed(2)}                          ║`);
console.log(`║    Volatilidad: ${volatility}%, posDiff: ${posDiff}                                   ║`);
console.log(`║    CONFIANZA FINAL: ${over25_conf}%                                          ║`);

console.log(`║                                                                    ║`);
console.log(`║  ⚠️  PROBLEMA: ${over15_conf > over25_conf ? 'OVER 1.5 tiene MÁS confianza ✓' : 'OVER 2.5 tiene IGUAL o MÁS confianza ✗'}            ║`);
console.log('╚═══════════════════════════════════════════════════════════════════╝');

// Verificar la prioridad
const PICK_PRIORITY = {
  'OVER_15': 100,
  'UNDER_35': 98,
  'UNDER_25': 92,
  'OVER_25': 80,
};

console.log(`\n📊 PRIORIDADES:`);
console.log(`   OVER_15: ${PICK_PRIORITY['OVER_15']}`);
console.log(`   OVER_25: ${PICK_PRIORITY['OVER_25']}`);

if (over15_conf >= 65 && over15_conf > over25_conf) {
  console.log(`\n✅ El motor debería elegir OVER 1.5 (${over15_conf}% confianza, prioridad ${PICK_PRIORITY['OVER_15']})`);
} else if (over15_conf === over25_conf) {
  console.log(`\n⚠️  Ambos tienen MISMA confianza (${over15_conf}%), se desempata por PRIORIDAD:`);
  console.log(`   OVER_15 (${PICK_PRIORITY['OVER_15']}) vs OVER_25 (${PICK_PRIORITY['OVER_25']})`);
  console.log(`   → Gana OVER_1.5 por mayor prioridad`);
}
