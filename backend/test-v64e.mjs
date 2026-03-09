// Test Motor v6.4e - Fórmula mejorada para TOTALES

function logisticCalibration(p) {
  if (p <= 0 || p >= 1) return p;
  const a = 0.92;
  const b = -0.03;
  const logOdds = Math.log(p / (1 - p));
  const calibratedLogOdds = a * logOdds + b;
  return 1 / (1 + Math.exp(-calibratedLogOdds));
}

function calibrarProbabilidad(prob, volatility, posDiff, pickType = '') {
  let calibrated = logisticCalibration(prob);
  
  let calibrationFactor = 1.0;
  if (posDiff <= 2) calibrationFactor *= 0.88;
  else if (posDiff <= 4) calibrationFactor *= 0.94;
  
  if (volatility > 50) calibrationFactor *= 0.92;
  else if (volatility > 35) calibrationFactor *= 0.96;
  
  calibrated *= calibrationFactor;
  
  const isTotalPick = pickType.includes('OVER') || pickType.includes('UNDER');
  let maxProb;
  
  if (isTotalPick) {
    maxProb = posDiff > 10 ? 0.88 : 0.82;
  } else {
    maxProb = posDiff > 10 ? 0.80 : 0.72;
  }
  
  return Math.min(calibrated, maxProb);
}

function calcularConfianza(poissonProb, eloProb, formFactor, volatility, posDiff, pickType) {
  const calibratedProb = calibrarProbabilidad(poissonProb, volatility, posDiff, pickType);
  const volatilityPenalty = volatility * 0.18 / 100;
  
  const isTotalPick = pickType.includes('OVER') || pickType.includes('UNDER');
  
  let confidence;
  if (isTotalPick) {
    // 🆕 v6.4e: Fórmula para TOTALES - probabilidad tiene MÁS peso
    confidence = (
      calibratedProb * 0.70 +
      eloProb * 0.15 +
      formFactor * 0.15
    ) - volatilityPenalty;
  } else {
    confidence = (
      calibratedProb * 0.50 +
      eloProb * 0.28 +
      formFactor * 0.22
    ) - volatilityPenalty;
  }
  
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

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║         MOTOR v6.4e - Fórmula Mejorada para TOTALES              ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const posDiff = 7;
const volatility = 35;
const golesPromedio = 2.5;

// OVER 1.5
const over15_prob = 0.88;
const over15_conf = calcularConfianza(over15_prob, 0.5, Math.min(1, golesPromedio/4), volatility, posDiff, 'OVER_15');

// OVER 2.5
const over25_prob = 0.71;
const over25_conf = calcularConfianza(over25_prob, 0.5, Math.min(1, golesPromedio/5), volatility, posDiff, 'OVER_25');

console.log('📊 Newcastle vs Barcelona (posDiff=7, volatility=35):');
console.log('─'.repeat(50));
console.log(`  OVER 1.5:`);
console.log(`    Prob Monte Carlo: ${(over15_prob * 100).toFixed(0)}%`);
console.log(`    Prob Calibrada:   ${(calibrarProbabilidad(over15_prob, volatility, posDiff, 'OVER_15') * 100).toFixed(0)}%`);
console.log(`    ✅ CONFIANZA FINAL: ${over15_conf}%`);
console.log('');
console.log(`  OVER 2.5:`);
console.log(`    Prob Monte Carlo: ${(over25_prob * 100).toFixed(0)}%`);
console.log(`    Prob Calibrada:   ${(calibrarProbabilidad(over25_prob, volatility, posDiff, 'OVER_25') * 100).toFixed(0)}%`);
console.log(`    ✅ CONFIANZA FINAL: ${over25_conf}%`);

console.log('');
console.log('─'.repeat(50));
const filtro = 65;
console.log(`  ${over15_conf >= filtro ? '✅' : '❌'} OVER 1.5 ${over15_conf >= filtro ? 'PASA' : 'NO pasa'} el filtro (≥${filtro}%)`);
console.log(`  ${over25_conf >= filtro ? '✅' : '❌'} OVER 2.5 ${over25_conf >= filtro ? 'PASA' : 'NO pasa'} el filtro (≥${filtro}%)`);

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                      EVOLUCIÓN DE CONFIANZA                       ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log('║  Versión   │ OVER 1.5 │ OVER 2.5 │ Diferencia │ Estado           ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log('║  v6.4c     │   57%    │   53%    │    +4%     │ Ninguno pasa     ║');
console.log('║  v6.4d     │   62%    │   53%    │    +9%     │ Ninguno pasa     ║');
console.log(`║  v6.4e     │   ${over15_conf}%    │   ${over25_conf}%    │   +${over15_conf - over25_conf}%     │ ${over15_conf >= filtro ? 'OVER 1.5 pasa ✅' : 'Ninguno pasa  '} ║`);
console.log('╚═══════════════════════════════════════════════════════════════════╝');

console.log('\n🎯 PICK RECOMENDADO FINAL: ' + (over15_conf >= filtro ? 'OVER 1.5 (MÁS SEGURO - pasa filtro)' : (over15_conf > over25_conf ? 'OVER 1.5 (fallback - más seguro)' : 'OVER 2.5')));
console.log('');
