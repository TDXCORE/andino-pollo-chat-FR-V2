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
  error?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'INTERNAL_ERROR';
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

    // 5. Procesar y filtrar resultados
    const suggestions: AddressSuggestion[] = data.results
      .slice(0, 3) // Máximo 3 sugerencias
      .filter((result: any) => {
        // Filtrar solo direcciones en Colombia
        const countryComponent = result.address_components?.find((comp: any) =>
          comp.types.includes('country')
        );
        return countryComponent?.short_name === 'CO';
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