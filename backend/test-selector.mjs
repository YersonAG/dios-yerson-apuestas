// Test: ¿Por qué se elige OVER 2.5 sobre OVER 1.5 en Atalanta vs Bayern?

// Simular las opciones después del cálculo
const options = [
  { type: 'OVER_15', probability: 0.923, confidence: 72, label: 'Más de 1.5 goles' },
  { type: 'OVER_25', probability: 0.791, confidence: 65, label: 'Más de 2.5 goles' },
  { type: 'UNDER_35', probability: 0.398, confidence: 55, label: 'Menos de 3.5 goles' },
  { type: 'BTTS_YES', probability: 0.660, confidence: 50, label: 'Ambos anotan' },
];

const PICK_PRIORITY = {
  'OVER_15': 100, 'UNDER_35': 98, 'UNDER_25': 92,
  'OVER_25': 80, 'BTTS_YES': 75,
};

const MIN_CONFIDENCE = 65;
const MIN_PROBABILITY = 0.58;

function filtrarPicks(options) {
  return options.filter(o => {
    if (o.probability < MIN_PROBABILITY) return false;
    if (o.confidence < MIN_CONFIDENCE) return false;
    return true;
  });
}

const xGTotal = 4.27;
const posDiff = 13; // #15 vs #2

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║    DEBUG: Atalanta vs Bayern - ¿Por qué OVER 2.5 sobre 1.5?      ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log('📊 TODAS LAS OPCIONES:');
options.forEach(o => {
  console.log(`   ${o.type}: prob=${(o.probability*100).toFixed(0)}%, conf=${o.confidence}%, prioridad=${PICK_PRIORITY[o.type]}`);
});

const safePicks = filtrarPicks(options);
console.log('\n✅ PICKS QUE PASAN EL FILTRO (prob≥58%, conf≥65%):');
safePicks.forEach(o => {
  console.log(`   ${o.type}: prob=${(o.probability*100).toFixed(0)}%, conf=${o.confidence}%, prioridad=${PICK_PRIORITY[o.type]}`);
});

// Simular el sort
console.log('\n🔄 SIMULANDO ORDENAMIENTO...');
safePicks.sort((a, b) => {
  // Si xGTotal alto, favorecer OVER
  if (xGTotal > 3.0) {
    const aIsOver = a.type === 'OVER_15' || a.type === 'OVER_25';
    const bIsOver = b.type === 'OVER_15' || b.type === 'OVER_25';
    
    console.log(`   Comparando ${a.type} vs ${b.type}:`);
    console.log(`     xGTotal=${xGTotal.toFixed(2)} > 3.0 → favour OVER`);
    console.log(`     ${a.type} is OVER: ${aIsOver}, ${b.type} is OVER: ${bIsOver}`);
    
    if (aIsOver && !bIsOver) {
      console.log(`     → ${a.type} gana (es OVER)`);
      return -1;
    }
    if (!aIsOver && bIsOver) {
      console.log(`     → ${b.type} gana (es OVER)`);
      return 1;
    }
    // Ambos son OVER o ninguno es OVER → continuar
    console.log(`     → Ambos son OVER o ninguno, continuar...`);
  }
  
  // Orden normal por prioridad
  const priorityA = PICK_PRIORITY[a.type] || 50;
  const priorityB = PICK_PRIORITY[b.type] || 50;
  console.log(`     Prioridad: ${a.type}=${priorityA}, ${b.type}=${priorityB}`);
  if (priorityA !== priorityB) {
    console.log(`     → ${priorityA > priorityB ? a.type : b.type} gana (mayor prioridad)`);
    return priorityB - priorityA;
  }
  
  console.log(`     → ${a.confidence > b.confidence ? a.type : b.type} gana (mayor confianza)`);
  return b.confidence - a.confidence;
});

console.log('\n🏆 ORDEN FINAL:');
safePicks.forEach((o, i) => {
  console.log(`   ${i+1}. ${o.type}: conf=${o.confidence}%, prioridad=${PICK_PRIORITY[o.type]}`);
});

console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
console.log(`   El código favorece OVER cuando xG > 3.0, pero trata igual OVER_15 y OVER_25`);
console.log(`   OVER_15 (prioridad 100) debería ganar sobre OVER_25 (prioridad 80)`);
console.log(`   PERO solo si ambos son OVER, el sort continúa a prioridad...`);
console.log('');
console.log('🎯 SOLUCIÓN:');
console.log('   Siempre preferir el pick de MAYOR CONFIANZA (más seguro)');
console.log('   La filosofía es "el pick más SEGURO", no el más arriesgado');
