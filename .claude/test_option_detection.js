// Script de prueba para la función detectOptionSelection

function detectOptionSelection(userResponse) {
  const lowerResponse = userResponse.toLowerCase();

  // Buscar patrones de números explícitos
  const numberPatterns = [
    /(?:opci[oó]n\s*)?(\d+)/,  // "opcion 1", "opción 2"
    /(?:n[uú]mero\s*)?(\d+)/,  // "numero 1", "número 2"
    /(?:la\s*)?(?:primera|1)/, // "primera", "la primera", "1"
    /(?:la\s*)?(?:segunda|2)/, // "segunda", "la segunda", "2"
    /(?:la\s*)?(?:tercera|3)/  // "tercera", "la tercera", "3"
  ];

  // Buscar números directos (1, 2, 3)
  const directNumber = lowerResponse.match(/^(\d+)$/);
  if (directNumber) {
    const num = parseInt(directNumber[1]);
    if (num >= 1 && num <= 3) return num;
  }

  // Buscar patrones con texto
  for (const pattern of numberPatterns) {
    const match = lowerResponse.match(pattern);
    if (match) {
      if (match[1]) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 3) return num;
      } else {
        // Casos especiales para primera/segunda/tercera
        if (lowerResponse.includes('primera') || lowerResponse.includes('1')) return 1;
        if (lowerResponse.includes('segunda') || lowerResponse.includes('2')) return 2;
        if (lowerResponse.includes('tercera') || lowerResponse.includes('3')) return 3;
      }
    }
  }

  return 0; // No se detectó ninguna opción válida
}

// PRUEBAS
console.log('=== PRUEBA DE DETECCIÓN DE OPCIONES ===\n');

const testResponses = [
  "opcion 1 correcta",
  "opción 1",
  "1",
  "numero 2",
  "número 2",
  "2",
  "la primera",
  "primera",
  "la segunda opcion",
  "segunda",
  "tercera",
  "3",
  "1️⃣",
  "sí la primera",
  "no la segunda",
  "elijo la opcion 3",
  "quiero la 2",
  "dame el numero 1",
  "esto no es una opcion",
  "cuarta opcion",
  "0",
  "4"
];

testResponses.forEach(response => {
  const result = detectOptionSelection(response);
  console.log(`"${response}" → ${result > 0 ? `Opción ${result}` : 'No detectado'}`);
});