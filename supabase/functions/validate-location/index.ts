import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationValidationRequest {
  latitude: number;
  longitude: number;
  formatted_address: string;
  session_id?: string;
}

interface SedeWithDistance {
  id: string;
  codigo: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  horario: string;
  latitud: number;
  longitud: number;
  radio_cobertura: number;
  distance_meters: number;
  within_radius: boolean;
}

interface LocationValidationResponse {
  within_radius: boolean;
  nearest_sede: {
    id: string;
    nombre: string;
    direccion: string;
    telefono: string;
    ciudad: string;
  };
  distance_meters: number;
  estimated_delivery_time: string;
  nearest_sedes: Array<{
    id: string;
    nombre: string;
    direccion: string;
    ciudad: string;
    distance_meters: number;
    within_radius: boolean;
  }>;
  coverage_available: boolean;
  validated_address: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, formatted_address, session_id }: LocationValidationRequest = await req.json();
    
    // Validar entrada
    if (!latitude || !longitude || !formatted_address) {
      return new Response(JSON.stringify({
        error: 'Faltan parámetros requeridos: latitude, longitude, formatted_address',
        within_radius: false
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validar rangos de coordenadas para Colombia
    if (latitude < -4.2 || latitude > 15.5 || longitude < -84.8 || longitude > -66.8) {
      console.log('Coordinates outside Colombia bounds:', { latitude, longitude });
      return new Response(JSON.stringify({
        error: 'Coordenadas fuera del territorio colombiano',
        within_radius: false,
        coverage_available: false,
        validated_address: formatted_address
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Validating location:', { latitude, longitude, formatted_address });

    // 1. Consultar todas las sedes activas con coordenadas
    const { data: sedes, error: sedesError } = await supabase
      .from('sedes')
      .select('*')
      .eq('activa', true)
      .not('latitud', 'is', null)
      .not('longitud', 'is', null);

    if (sedesError) {
      console.error('Error querying sedes:', sedesError);
      throw new Error('Error consultando sedes');
    }

    if (!sedes?.length) {
      console.log('No active sedes found with coordinates');
      return new Response(JSON.stringify({
        error: 'No hay sedes disponibles con coordenadas configuradas',
        within_radius: false,
        coverage_available: false,
        validated_address: formatted_address
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Found ${sedes.length} active sedes with coordinates`);

    // 2. Calcular distancias a todas las sedes
    const sedesWithDistance: SedeWithDistance[] = sedes.map(sede => {
      const distance = calculateDistance(
        latitude, longitude,
        sede.latitud, sede.longitud
      );
      
      const radioCobertura = sede.radio_cobertura || 5000; // Default 5km
      
      return {
        ...sede,
        distance_meters: distance,
        within_radius: distance <= radioCobertura
      };
    });

    // 3. Ordenar por distancia
    sedesWithDistance.sort((a, b) => a.distance_meters - b.distance_meters);

    console.log('Sedes with distances:', sedesWithDistance.map(s => ({
      nombre: s.nombre,
      distance: s.distance_meters,
      within_radius: s.within_radius
    })));

    // 4. Encontrar sedes con cobertura
    const sedesWithCoverage = sedesWithDistance.filter(s => s.within_radius);
    const nearestSede = sedesWithDistance[0];

    // 5. Calcular tiempo estimado de entrega
    const estimatedDeliveryTime = calculateDeliveryTime(nearestSede.distance_meters);

    // 6. Preparar respuesta
    const response: LocationValidationResponse = {
      within_radius: sedesWithCoverage.length > 0,
      nearest_sede: {
        id: nearestSede.id,
        nombre: nearestSede.nombre,
        direccion: nearestSede.direccion,
        telefono: nearestSede.telefono || 'Sin teléfono',
        ciudad: nearestSede.ciudad
      },
      distance_meters: nearestSede.distance_meters,
      estimated_delivery_time: estimatedDeliveryTime,
      nearest_sedes: sedesWithDistance.slice(0, 3).map(sede => ({
        id: sede.id,
        nombre: sede.nombre,
        direccion: sede.direccion,
        ciudad: sede.ciudad,
        distance_meters: sede.distance_meters,
        within_radius: sede.within_radius
      })),
      coverage_available: sedesWithCoverage.length > 0,
      validated_address: formatted_address
    };

    console.log('Validation result:', {
      within_radius: response.within_radius,
      nearest_sede: response.nearest_sede.nombre,
      distance: response.distance_meters,
      coverage_available: response.coverage_available
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Location validation error:', error);
    return new Response(JSON.stringify({
      error: 'Error interno validando ubicación',
      within_radius: false,
      coverage_available: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// === FUNCIONES AUXILIARES ===

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Fórmula de Haversine para calcular distancia entre dos puntos geográficos
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
}

function calculateDeliveryTime(distanceMeters: number): string {
  // Cálculo de tiempo estimado de entrega
  const baseTime = 15; // minutos base de preparación
  const timePerKm = 5;  // 5 minutos adicionales por kilómetro
  
  const distanceKm = distanceMeters / 1000;
  const totalTime = baseTime + (distanceKm * timePerKm);
  
  // Rangos de tiempo con un poco de variabilidad
  const minTime = Math.max(20, Math.round(totalTime - 5));
  const maxTime = Math.round(totalTime + 10);
  
  return `${minTime}-${maxTime} minutos`;
}

// Función para validar si las coordenadas están dentro de los límites de Colombia
function isWithinColombiaBounds(lat: number, lng: number): boolean {
  // Límites aproximados de Colombia
  const bounds = {
    north: 15.5,  // Guajira
    south: -4.2,  // Amazonas
    east: -66.8,  // Guainía
    west: -84.8   // Nariño (Pacífico)
  };
  
  return lat >= bounds.south && lat <= bounds.north && 
         lng >= bounds.west && lng <= bounds.east;
}