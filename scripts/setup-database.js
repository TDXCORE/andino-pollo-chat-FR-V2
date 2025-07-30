// Script para configurar la base de datos con validación geográfica
// Ejecuta la migración manualmente usando el cliente de Supabase

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dwjzifaxhuvqvjlxatnj.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3anppZmF4aHV2cXZqbHhhdG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODU4NDMsImV4cCI6MjA2ODM2MTg0M30.-KYCwWhZzLS6a_4HyLop_neu2hoxJRf1FFRVYi7nPcU";

console.log('🚀 Configurando base de datos para validación geográfica...\n');

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  console.log('🔗 Probando conexión con Supabase...');
  try {
    const { data, error } = await supabase.from('sedes').select('count').limit(1);
    if (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
    console.log('✅ Conexión exitosa con Supabase');
    return true;
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    return false;
  }
}

async function executeMigrationSteps() {
  console.log('\n📋 Ejecutando pasos de migración...\n');

  // Paso 1: Agregar columnas a tabla sedes
  console.log('1️⃣ Agregando columnas geográficas a tabla sedes...');
  try {
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.sedes 
        ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
        ADD COLUMN IF NOT EXISTS radio_cobertura INTEGER DEFAULT 5000;
      `
    });
    
    if (alterError && !alterError.message.includes('already exists')) {
      console.log('⚠️ Note: Las columnas podrían ya existir o necesitan ser creadas manualmente en el panel de Supabase');
    } else {
      console.log('✅ Columnas agregadas exitosamente');
    }
  } catch (err) {
    console.log('⚠️ Paso 1 requiere privilegios administrativos. Ejecutar manualmente en panel de Supabase.');
  }

  // Paso 2: Actualizar coordenadas de sedes existentes
  console.log('\n2️⃣ Actualizando coordenadas de sedes...');
  try {
    // Medellín
    await supabase
      .from('sedes')
      .update({ 
        latitud: 6.2442, 
        longitud: -75.5812,
        radio_cobertura: 5000 
      })
      .eq('codigo', 'MED01');

    // Bogotá
    await supabase
      .from('sedes')
      .update({ 
        latitud: 4.6769, 
        longitud: -74.0508,
        radio_cobertura: 5000 
      })
      .eq('codigo', 'BOG01');

    // Cali
    await supabase
      .from('sedes')
      .update({ 
        latitud: 3.4516, 
        longitud: -76.5320,
        radio_cobertura: 5000 
      })
      .eq('codigo', 'CAL01');

    // Barranquilla
    await supabase
      .from('sedes')
      .update({ 
        latitud: 10.9685, 
        longitud: -74.7813,
        radio_cobertura: 5000 
      })
      .eq('codigo', 'BAR01');

    console.log('✅ Coordenadas de sedes actualizadas');
  } catch (err) {
    console.log('⚠️ Error actualizando coordenadas:', err.message);
  }

  // Paso 3: Verificar sedes actualizadas
  console.log('\n3️⃣ Verificando sedes actualizadas...');
  try {
    const { data: sedes, error } = await supabase
      .from('sedes')
      .select('codigo, nombre, latitud, longitud, radio_cobertura');

    if (error) {
      console.log('❌ Error consultando sedes:', error.message);
    } else {
      console.log('✅ Sedes con coordenadas:');
      sedes.forEach(sede => {
        console.log(`   ${sede.codigo}: ${sede.nombre} (${sede.latitud}, ${sede.longitud})`);
      });
    }
  } catch (err) {
    console.log('⚠️ Error verificando sedes:', err.message);
  }
}

async function checkEdgeFunctions() {
  console.log('\n🔧 Verificando Edge Functions...');
  
  // Probar función geocode
  console.log('🔍 Probando función geocode...');
  try {
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { address: 'Carrera 15 # 93-07, Chapinero, Bogotá' }
    });
    
    if (error) {
      console.log('❌ Función geocode no disponible:', error.message);
      console.log('💡 Necesita ser desplegada manualmente');
    } else {
      console.log('✅ Función geocode funcionando');
    }
  } catch (err) {
    console.log('❌ Función geocode no desplegada');
  }

  // Probar función validate-location
  console.log('📍 Probando función validate-location...');
  try {
    const { data, error } = await supabase.functions.invoke('validate-location', {
      body: { 
        latitude: 4.6769, 
        longitude: -74.0508, 
        formatted_address: 'Calle 85 # 15-20, Zona Rosa, Bogotá' 
      }
    });
    
    if (error) {
      console.log('❌ Función validate-location no disponible:', error.message);
      console.log('💡 Necesita ser desplegada manualmente');
    } else {
      console.log('✅ Función validate-location funcionando');
    }
  } catch (err) {
    console.log('❌ Función validate-location no desplegada');
  }
}

async function main() {
  try {
    // Probar conexión
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ No se pudo conectar con Supabase. Verifica las credenciales.');
      return;
    }

    // Ejecutar migración
    await executeMigrationSteps();

    // Verificar Edge Functions
    await checkEdgeFunctions();

    console.log('\n🎉 CONFIGURACIÓN COMPLETADA\n');
    console.log('📋 PRÓXIMOS PASOS MANUALES:');
    console.log('1. Ve al panel de Supabase: https://supabase.com/dashboard/project/dwjzifaxhuvqvjlxatnj');
    console.log('2. En "Edge Functions", despliega las funciones "geocode" y "validate-location"');
    console.log('3. En "Settings > Environment variables", configura GOOGLE_MAPS_API_KEY');
    console.log('4. Verifica que las columnas geográficas se agregaron a las tablas');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
  }
}

main();