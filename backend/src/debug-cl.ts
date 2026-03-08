// Debug ESPN Standings Champions League
async function debugCL() {
  const url = 'https://site.api.espn.com/apis/v2/sports/soccer/uefa.champions/standings';
  
  console.log('📊 Obteniendo datos de Champions League...\n');
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  
  // Mostrar estructura
  const entries = data.standings?.entries || [];
  
  console.log(`Total equipos: ${entries.length}\n`);
  
  // Mostrar los primeros 5 equipos con todos sus stats
  for (let i = 0; i < Math.min(5, entries.length); i++) {
    const entry = entries[i];
    console.log(`\n=== ${entry.team?.displayName} ===`);
    console.log(`Posición: ${entry.team?.rank || 'N/A'}`);
    
    // Mostrar todos los stats disponibles
    console.log('Stats disponibles:');
    for (const stat of (entry.stats || [])) {
      console.log(`  - ${stat.name}: ${stat.value}`);
    }
  }
  
  // Buscar Liverpool específicamente
  console.log('\n\n=== Buscando Liverpool ===');
  for (const entry of entries) {
    if (entry.team?.displayName?.toLowerCase().includes('liverpool')) {
      console.log(`\nEquipo: ${entry.team?.displayName}`);
      console.log('Todos los stats:');
      for (const stat of (entry.stats || [])) {
        console.log(`  - ${stat.name}: ${stat.value} (${stat.type || 'N/A'})`);
      }
    }
  }
}

debugCL().catch(console.error);
