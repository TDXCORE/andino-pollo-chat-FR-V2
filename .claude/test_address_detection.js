// Script de prueba para la función detectInternationalAddress
// Para probar la dirección problemática: "cra 42a #30-08 medellin san diego"

function detectInternationalAddress(address) {
  const lowercaseAddress = address.toLowerCase();

  // PRIMERO: Verificar si hay indicadores claros de que es dirección colombiana
  const colombianIndicators = [
    /\b(colombia|bogot[aá]|medell[ií]n|cali|barranquilla|cartagena|bucaramanga|pereira|manizales|villavicencio|santa marta|pasto|c[ua]cuta|ibagu[eé]|soledad|soacha|monteria|valledupar|bello|itagui|palmi[ra]|sincelejo|envigado|tunja|florencia|maicao|riohacha|arauca|yopal|mocoa|leticia|puerto carre[ñn]o|mit[ua]|san jos[eé] del guaviare|quibd[oó]|puerto in[ií]rida|san andr[eé]s)\b/i,
    /\b(cundinamarca|antioquia|valle del cauca|atlantico|bolivar|santander|nari[ñn]o|cordoba|tolima|huila|norte de santander|cauca|magdalena|la guajira|boyaca|casanare|meta|sucre|cesar|caldas|risaralda|quindio|choco|caqueta|putumayo|arauca|amazonas|guainia|guaviare|vaupES|vichada|san andres)\b/i,
    /\b(cra|carrera|calle|cl|kr|dg|diagonal|tv|transversal|av|avenida)\s*\d+/i
  ];

  // Si tiene indicadores colombianos fuertes, NO es internacional
  const hasColombianIndicators = colombianIndicators.some(pattern => pattern.test(lowercaseAddress));
  console.log(`Colombian indicators check for "${address}": ${hasColombianIndicators}`);

  if (hasColombianIndicators) {
    return { isInternational: false };
  }

  // Patrones de países y ciudades internacionales comunes
  const internationalPatterns = [
    // Estados Unidos - Patrones más específicos para evitar conflictos con nombres colombianos
    { pattern: /\b(new york|manhattan|brooklyn|los angeles|miami|chicago|houston|phoenix|philadelphia|dallas|austin|jacksonville|fort worth|columbus|charlotte|detroit|el paso|seattle|denver|washington dc|boston|nashville|baltimore|oklahoma city|portland|las vegas|louisville|milwaukee|albuquerque|tucson|fresno|sacramento|mesa|kansas city|atlanta|long beach|colorado springs|raleigh|virginia beach|omaha|minneapolis|tulsa|cleveland|wichita|arlington)\b/i, country: 'Estados Unidos', message: '🇺🇸 Detecté una dirección en Estados Unidos. Solo realizamos entregas en Colombia.' },
    // Patrones de Estados Unidos con contexto (evitar san antonio y san diego sin contexto)
    { pattern: /\bsan (antonio|diego),?\s+(california|texas|ca|tx|usa|united states)\b/i, country: 'Estados Unidos', message: '🇺🇸 Detecté una dirección en Estados Unidos. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(usa|united states|america|us|ny|ca|tx|fl|il|pa|oh|ga|nc|mi|nj|va|wa|az|ma|tn|in|mo|md|wi|co|mn|sc|al|la|ky|or|ok|ct|ia|ms|ar|ut|ks|nv|nm|ne|wv|id|hi|nh|me|ri|mt|de|sd|nd|ak|vt|wy)\b/i, country: 'Estados Unidos', message: '🇺🇸 Detecté una dirección en Estados Unidos. Solo realizamos entregas en Colombia.' },

    // España
    { pattern: /\b(madrid|barcelona|valencia|sevilla|zaragoza|málaga|murcia|palma|las palmas|bilbao|alicante|córdoba|valladolid|vigo|gijón|hospitalet|vitoria|granada|elche|oviedo|badalona|cartagena|terrassa|jerez|sabadell|móstoles|alcalá|pamplona|fuenlabrada|almería|leganés)\b/i, country: 'España', message: '🇪🇸 Detecté una dirección en España. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(españa|spain|spanish|espana)\b/i, country: 'España', message: '🇪🇸 Detecté una dirección en España. Solo realizamos entregas en Colombia.' },

    // Patrones generales de direcciones internacionales
    { pattern: /\b\d+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|ct|court|pl|place|way)\b/i, country: 'Internacional', message: '🌍 Esta dirección parece ser internacional. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(zip code|postal code|postcode)\s*:?\s*\d+/i, country: 'Internacional', message: '🌍 Detecté un código postal internacional. Solo realizamos entregas en Colombia.' }
  ];

  // Buscar patrones internacionales
  for (const { pattern, country, message } of internationalPatterns) {
    if (pattern.test(lowercaseAddress)) {
      console.log(`International pattern match for "${address}": ${country} (pattern: ${pattern})`);
      return {
        isInternational: true,
        country,
        message
      };
    }
  }

  console.log(`No international patterns matched for "${address}"`);
  return { isInternational: false };
}

// PRUEBAS
console.log('=== PRUEBA DE DETECCIÓN DE DIRECCIONES ===\n');

const testAddresses = [
  "cra 42a #30-08 medellin san diego",
  "cra 42a #30-08 san diego medellin",
  "carrera 42a #30-08 medellín san diego",
  "san diego california",
  "san diego, ca",
  "123 main street san diego california",
  "times square new york",
  "madrid españa",
  "calle 123 #45-67 bogotá",
  "av 68 #123-45 barranquilla"
];

testAddresses.forEach(address => {
  console.log(`\nProbando: "${address}"`);
  const result = detectInternationalAddress(address);
  console.log(`Resultado: ${result.isInternational ? `INTERNACIONAL (${result.country})` : 'COLOMBIANA'}`);
  console.log('---');
});