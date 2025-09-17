// Script de prueba para el parsing de órdenes sin comas

function parseOrderInput(userMessage) {
  console.log('Processing order input:', userMessage);

  // Try to extract order data with or without commas
  let nombre = '';
  let telefono = '';
  let producto = '';

  if (userMessage.includes(',')) {
    // Format with commas: "nombre, telefono, producto"
    const parts = userMessage.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      nombre = parts[0];
      telefono = parts[1];
      producto = parts[2] || 'pollo entero';
    }
  } else {
    // Format without commas: extract using patterns
    // Pattern: "name phone_number product_description"
    const phoneMatch = userMessage.match(/\b\d{10}\b/); // 10-digit phone number

    if (phoneMatch) {
      telefono = phoneMatch[0];
      const phoneIndex = userMessage.indexOf(telefono);

      // Extract name (everything before phone number)
      nombre = userMessage.substring(0, phoneIndex).trim();

      // Extract product (everything after phone number)
      const afterPhone = userMessage.substring(phoneIndex + telefono.length).trim();

      // Clean up product description
      producto = afterPhone
        .replace(/^(y\s+)?(quiero|deseo|necesito|solicito)\s+/i, '') // Remove "y quiero", "deseo", etc.
        .replace(/\s+por\s+favor\s*$/i, '') // Remove "por favor" at the end
        .trim() || 'pollo entero';
    }
  }

  return { nombre, telefono, producto, isValid: nombre && telefono && producto };
}

// PRUEBAS
console.log('=== PRUEBA DE PARSING DE ÓRDENES ===\n');

const testOrders = [
  // Caso original del usuario
  "claro que si Freddy Rincones 3153041548 y quiero un pollo entero por favor",

  // Otros formatos sin comas
  "Juan Pérez 3001234567 pollo entero",
  "María García 3112345678 y quiero pechuga asada",
  "Carlos López 3203456789 necesito muslos de pollo por favor",
  "Ana Rodríguez 3154567890 deseo alas de pollo",

  // Formato tradicional con comas (debería seguir funcionando)
  "Pedro Gómez, 3015678901, pollo entero",
  "Laura Jiménez, 3126789012, pechuga asada",

  // Casos problemáticos
  "solo quiero un pollo entero", // sin teléfono
  "Juan sin teléfono pollo entero", // sin teléfono válido
  "3153041548 quiero pollo", // sin nombre
];

testOrders.forEach((order, index) => {
  console.log(`\n--- PRUEBA ${index + 1} ---`);
  console.log(`Entrada: "${order}"`);

  const result = parseOrderInput(order);

  console.log(`Resultado:`);
  console.log(`  Nombre: "${result.nombre}"`);
  console.log(`  Teléfono: "${result.telefono}"`);
  console.log(`  Producto: "${result.producto}"`);
  console.log(`  Válido: ${result.isValid ? '✅' : '❌'}`);
});

console.log('\n=== CASO ESPECÍFICO DEL USUARIO ===');
const userCase = "claro que si Freddy Rincones 3153041548 y quiero un pollo entero por favor";
const result = parseOrderInput(userCase);
console.log(`✅ DEBERÍA FUNCIONAR:`);
console.log(`   Nombre: "Freddy Rincones"`);
console.log(`   Teléfono: "3153041548"`);
console.log(`   Producto: "un pollo entero"`);
console.log(`\n🔍 RESULTADO REAL:`);
console.log(`   Nombre: "${result.nombre}"`);
console.log(`   Teléfono: "${result.telefono}"`);
console.log(`   Producto: "${result.producto}"`);
console.log(`   Válido: ${result.isValid ? '✅' : '❌'}`);