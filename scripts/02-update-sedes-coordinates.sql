-- PASO 2: Actualizar coordenadas de sedes existentes
-- Ejecutar DESPUÉS del paso 1

-- Medellín Centro: Carrera 50 # 45-30
UPDATE public.sedes SET 
  latitud = 6.2442, 
  longitud = -75.5812,
  radio_cobertura = 5000
WHERE codigo = 'MED01';

-- Bogotá Norte: Calle 85 # 15-20, Zona Rosa  
UPDATE public.sedes SET 
  latitud = 4.6769, 
  longitud = -74.0508,
  radio_cobertura = 5000
WHERE codigo = 'BOG01';

-- Cali Sur: Avenida 6N # 28-50, Granada
UPDATE public.sedes SET 
  latitud = 3.4516, 
  longitud = -76.5320,
  radio_cobertura = 5000
WHERE codigo = 'CAL01';

-- Barranquilla: Carrera 53 # 72-15, El Prado
UPDATE public.sedes SET 
  latitud = 10.9685, 
  longitud = -74.7813,
  radio_cobertura = 5000
WHERE codigo = 'BAR01';

-- Verificar que se actualizaron correctamente
SELECT codigo, nombre, latitud, longitud, radio_cobertura 
FROM public.sedes 
WHERE latitud IS NOT NULL;