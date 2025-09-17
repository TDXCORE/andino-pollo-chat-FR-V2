// Script de prueba para la detección de rechazo mejorada

function testRejectionDetection(userResponse) {
  const lowerResponse = userResponse.toLowerCase();

  // Detectar rechazo PRIMERO (más específico)
  const isRejection = lowerResponse.includes('no es correcta') ||
                     lowerResponse.includes('no es correcto') ||
                     lowerResponse.includes('no está correcta') ||
                     lowerResponse.includes('no está correcto') ||
                     lowerResponse.includes('incorrecta') ||
                     lowerResponse.includes('incorrecto') ||
                     lowerResponse.includes('no, ') ||  // "no, esa no es"
                     lowerResponse.startsWith('no ') ||  // "no esa no es"
                     lowerResponse === 'no' ||
                     lowerResponse.includes('❌') ||
                     lowerResponse.includes('ninguna es correcta') ||
                     lowerResponse.includes('ninguna está correcta');

  // Detectar confirmación positiva (solo si NO es rechazo)
  const isConfirmation = !isRejection && (
                       lowerResponse.includes('sí') ||
                       lowerResponse.includes('si') ||
                       lowerResponse.includes('correcta') ||
                       lowerResponse.includes('correcto') ||
                       lowerResponse.includes('orrecta') ||  // Error tipográfico común
                       lowerResponse.includes('orrecto') ||  // Error tipográfico común
                       lowerResponse.includes('corecta') ||  // Error tipográfico común
                       lowerResponse.includes('confirmado') ||
                       lowerResponse.includes('confirmo') ||
                       lowerResponse.includes('✅') ||
                       lowerResponse.includes('ok') ||
                       lowerResponse.includes('vale') ||
                       lowerResponse.includes('perfecto') ||
                       lowerResponse.includes('exacto') ||
                       lowerResponse.includes('así es') ||
                       lowerResponse.includes('bien')
                     );

  return { isRejection, isConfirmation };
}

// PRUEBAS
console.log('=== PRUEBA DE DETECCIÓN DE RECHAZO Y CONFIRMACIÓN ===\n');

const testResponses = [
  // Casos de RECHAZO que antes fallaban
  "no es correcta",
  "no es correcto",
  "no está correcta",
  "esa no es correcta",
  "no",
  "no, esa no es",
  "no esa dirección",
  "incorrecta",
  "incorrecto",
  "ninguna es correcta",

  // Casos de CONFIRMACIÓN
  "sí es correcta",
  "si está correcta",
  "correcta",
  "correcto",
  "orrecta", // error tipográfico
  "está bien",
  "perfecto",
  "✅ sí",
  "ok",

  // Casos AMBIGUOS que deben manejarse bien
  "creo que es correcta pero no estoy seguro"
];

testResponses.forEach(response => {
  const result = testRejectionDetection(response);
  let status = 'NEUTRAL';
  if (result.isRejection) status = 'RECHAZO';
  else if (result.isConfirmation) status = 'CONFIRMACIÓN';

  console.log(`"${response}" → ${status}`);
});

console.log('\n=== CASOS CRÍTICOS ===');
console.log('❌ ANTES: "no es correcta" → CONFIRMACIÓN (INCORRECTO)');
console.log('✅ AHORA: "no es correcta" → RECHAZO (CORRECTO)');