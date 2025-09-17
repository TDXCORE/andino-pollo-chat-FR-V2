import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  address: string;
  session_id?: string;
}

interface AddressSuggestion {
  formatted: string;
  placeId: string;
  coordinates: { lat: number; lng: number };
  confidence: number;
  components: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    department?: string;
  };
}

interface GeocodeResponse {
  isValid: boolean;
  suggestions: AddressSuggestion[];
  fromCache: boolean;
  error?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'INTERNATIONAL_ADDRESS';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, session_id }: GeocodeRequest = await req.json();
    
    // Validar entrada
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INVALID_FORMAT'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleApiKey) {
      console.error('Google Maps API key not configured');
      return new Response(JSON.stringify({
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INTERNAL_ERROR'
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Limpiar y normalizar dirección
    const cleanAddress = cleanAddressInput(address);
    console.log('Cleaned address:', cleanAddress);

    // 1.1. Detectar direcciones internacionales obvias ANTES de API
    const internationalCheck = detectInternationalAddress(cleanAddress);
    if (internationalCheck.isInternational) {
      console.log('International address detected:', internationalCheck.country);
      return new Response(JSON.stringify({
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INTERNATIONAL_ADDRESS',
        detectedCountry: internationalCheck.country,
        message: internationalCheck.message
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Verificar caché primero
    const { data: cached } = await supabase
      .from('direcciones_validadas')
      .select('*')
      .eq('direccion_original', cleanAddress)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log('Address found in cache');
      return new Response(JSON.stringify({
        isValid: true,
        suggestions: [{
          formatted: cached.direccion_formateada,
          placeId: cached.place_id || '',
          coordinates: { lat: cached.latitud, lng: cached.longitud },
          confidence: cached.confidence_score || 0.8,
          components: {
            city: cached.ciudad,
            neighborhood: cached.barrio
          }
        }],
        fromCache: true
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Validación básica del formato colombiano
    if (!isValidColombianAddress(cleanAddress)) {
      console.log('Invalid Colombian address format');
      return new Response(JSON.stringify({
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INVALID_FORMAT'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Consultar Google Geocoding API
    console.log('Querying Google Geocoding API for:', cleanAddress);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(cleanAddress)}&` +
      `region=co&` +
      `components=country:CO&` +
      `key=${googleApiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    console.log('Google API response status:', data.status);
    console.log('Google API results count:', data.results?.length || 0);

    if (data.status !== 'OK' || !data.results?.length) {
      return new Response(JSON.stringify({
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'NOT_FOUND'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5. Procesar y filtrar resultados - Validación mejorada de país
    const suggestions: AddressSuggestion[] = data.results
      .slice(0, 3) // Máximo 3 sugerencias
      .filter((result: any) => {
        // Validación robusta de país
        const countryComponent = result.address_components?.find((comp: any) =>
          comp.types.includes('country')
        );

        const isInColombia = countryComponent?.short_name === 'CO' ||
                            countryComponent?.long_name?.toLowerCase().includes('colombia');

        if (!isInColombia) {
          console.log('Filtering out non-Colombian result:', {
            formatted_address: result.formatted_address,
            country: countryComponent?.long_name || 'Unknown'
          });
        }

        return isInColombia;
      })
      .map((result: any) => {
        const confidence = calculateConfidence(cleanAddress, result.formatted_address);
        const components = extractAddressComponents(result.address_components);
        
        return {
          formatted: result.formatted_address,
          placeId: result.place_id,
          coordinates: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          },
          confidence,
          components
        };
      });

    // 6. Guardar en caché el mejor resultado
    if (suggestions.length > 0) {
      const best = suggestions[0];
      try {
        await supabase.from('direcciones_validadas').insert({
          direccion_original: cleanAddress,
          direccion_formateada: best.formatted,
          latitud: best.coordinates.lat,
          longitud: best.coordinates.lng,
          ciudad: best.components.city,
          barrio: best.components.neighborhood,
          place_id: best.placeId,
          confidence_score: best.confidence
        });
        console.log('Address cached successfully');
      } catch (cacheError) {
        console.error('Error caching address:', cacheError);
        // No fallar si no se puede cachear
      }
    }

    return new Response(JSON.stringify({
      isValid: suggestions.length > 0,
      suggestions,
      fromCache: false
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Geocode function error:', error);
    return new Response(JSON.stringify({
      isValid: false,
      suggestions: [],
      fromCache: false,
      error: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// === FUNCIONES AUXILIARES ===

function cleanAddressInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios → un espacio
    .replace(/[^\w\s#\-\.]/g, '') // Remover caracteres especiales excepto # - .
    .toLowerCase();
}

function isValidColombianAddress(address: string): boolean {
  // Validaciones básicas para direcciones colombianas
  const patterns = [
    /\b(calle|carrera|diagonal|transversal|avenida|av|kr|cl|cra|car|cll|dg|tv)\b/i,
    /\d+/, // Debe contener al menos un número
  ];

  // Al menos debe cumplir con el patrón de vía + número
  const hasRoadType = patterns[0].test(address);
  const hasNumber = patterns[1].test(address);

  return hasRoadType && hasNumber;
}

function calculateConfidence(original: string, formatted: string): number {
  // Algoritmo simple de similitud de strings
  const similarity = stringSimilarity(original.toLowerCase(), formatted.toLowerCase());
  return Math.min(Math.max(similarity, 0.1), 1.0);
}

function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

function extractAddressComponents(components: any[]): any {
  const result: any = {};

  if (!components) return result;

  components.forEach(component => {
    const types = component.types;
    if (types.includes('street_number')) {
      result.number = component.long_name;
    } else if (types.includes('route')) {
      result.street = component.long_name;
    } else if (types.includes('sublocality') || types.includes('neighborhood')) {
      result.neighborhood = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.department = component.long_name;
    }
  });

  return result;
}

function detectInternationalAddress(address: string): {
  isInternational: boolean;
  country?: string;
  message?: string;
} {
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

    // México
    { pattern: /\b(méxico|mexico|ciudad de méxico|guadalajara|monterrey|puebla|tijuana|león|juárez|zapopan|nezahualcóyotl|chihuahua|naucalpan|mérida|san luis potosí|aguascalientes|hermosillo|saltillo|mexicali|culiacán|acapulco|tlalnepantla|cancún|querétaro|chimalhuacán|reynosa|tlaquepaque|tuxtla|victoria|durango|toluca|morelia|xalapa|veracruz|villahermosa|irapuato|cuernavaca|oaxaca|tampico|mazatlán|coatzacoalcos)\b/i, country: 'México', message: '🇲🇽 Detecté una dirección en México. Solo realizamos entregas en Colombia.' },

    // Argentina
    { pattern: /\b(argentina|buenos aires|córdoba|rosario|mendoza|tucumán|la plata|mar del plata|salta|santa fe|san juan|neuquén|resistencia|santiago del estero|corrientes|posadas|bahía blanca|paraná|formosa|san luis|la rioja|río cuarto|comodoro rivadavia|san rafael|concordia|san salvador)\b/i, country: 'Argentina', message: '🇦🇷 Detecté una dirección en Argentina. Solo realizamos entregas en Colombia.' },

    // Brasil
    { pattern: /\b(brasil|brazil|são paulo|rio de janeiro|brasília|salvador|fortaleza|belo horizonte|manaus|curitiba|recife|goiânia|belém|porto alegre|guarulhos|campinas|nova iguaçu|maceió|são luís|duque de caxias|natal|teresina|campo grande|são bernardo|santos|joão pessoa|jaboatão|osasco|ribeirão preto|uberlândia|sorocaba|contagem|aracaju|feira de santana|cuiabá|joinville|juiz de fora|londrina|niterói|porto velho|florianópolis|serra|vila velha|caxias do sul|macapá|pelotas|canoas|vitória|carapicuíba|jundiaí|piracicaba|cariacica|franca|anápolis|bauru|itaquaquecetuba|são vicente|petrópolis|vitória da conquista|ponta grossa|blumenau|boa vista|cascavel|paulista|santa maria|guarujá|são josé do rio preto|mogi das cruzes|diadema|betim|campina grande|maringá|olinda|são joão de meriti|são josé dos campos|jequié|montes claros|suzano|gravataí|taboão da serra|sobral|são leopoldo|dourados|americana|rio branco|presidente prudente|novo hamburgo|santa bárbara d\'oeste|são caetano do sul|praia grande|jahu|rio das ostras|barueri|embu|francisco morato|itu|bragança paulista|passo fundo|santa cruz do sul|cachoeirinha|lages|sapucaia do sul|botucatu|santo andré|são carlos|jaú|marília|araraquara|rio claro|limeira|indaiatuba|presidente prudente|santa rita do sapucaí|araçatuba|votorantim|taubaté|são josé dos pinhais|cotia|itapevi|são mateus|colombo|guaratinguetá|itapetininga|franco da rocha|várzea grande|santarém|cabo frio|nova friburgo|águas lindas|valparaíso|trindade|aparecida de goiânia|rio verde|catalão|itumbiara|anápolis|goiânia|luziânia|senador canedo|santa cruz)\b/i, country: 'Brasil', message: '🇧🇷 Detecté una dirección en Brasil. Solo realizamos entregas en Colombia.' },

    // Chile - Removiendo nombres ambiguos que existen en Colombia
    { pattern: /\b(chile|santiago|valparaíso|concepción|la serena|antofagasta|temuco|rancagua|talca|arica|chillán|iquique|puerto montt|calama|coquimbo|osorno|valdivia|punta arenas|copiapó|quillota|curicó|ovalle|melipilla|san felipe|linares|tarapacá|cauquenes|castro|ancud|villarrica|angol|traiguén|lautaro|nueva imperial|padre las casas|gorbea|pitrufquén|freire|cunco|curacautín|lonquimay|collipulli|ercilla|renaico|los sauces|mulchén|nacimiento|quilaco|quilleco|san rosendo|laja|yumbel|cabrero|tucapel|antuco|san ignacio|el carmen|pemuco|bulnes|quillón|ñipas|coelemu|trehuaco|portezuelo|coihueco|pinto|san nicolás|ñiquén|san carlos|ninhue|quirihue|cobquecura|pedro quintana|diego de almagro|huasco|freirina|caldera|tierra amarilla|vallenar)\b/i, country: 'Chile', message: '🇨🇱 Detecté una dirección en Chile. Solo realizamos entregas en Colombia.' },
    // Chile con contexto específico
    { pattern: /\bsan antonio,?\s+(chile|región de valparaíso)\b/i, country: 'Chile', message: '🇨🇱 Detecté una dirección en Chile. Solo realizamos entregas en Colombia.' },

    // Otros países comunes
    { pattern: /\b(france|francia|paris|lyon|marseille)\b/i, country: 'Francia', message: '🇫🇷 Detecté una dirección en Francia. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(italy|italia|rome|milan|naples|turin)\b/i, country: 'Italia', message: '🇮🇹 Detecté una dirección en Italia. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(germany|alemania|berlin|hamburg|munich|cologne)\b/i, country: 'Alemania', message: '🇩🇪 Detecté una dirección en Alemania. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(canada|toronto|montreal|vancouver|ottawa|calgary)\b/i, country: 'Canadá', message: '🇨🇦 Detecté una dirección en Canadá. Solo realizamos entregas en Colombia.' },
    { pattern: /\b(uk|united kingdom|london|manchester|birmingham|glasgow|liverpool)\b/i, country: 'Reino Unido', message: '🇬🇧 Detecté una dirección en Reino Unido. Solo realizamos entregas en Colombia.' },

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