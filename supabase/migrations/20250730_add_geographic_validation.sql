-- Migración para validación geográfica de pedidos
-- Fecha: 2025-07-30
-- Descripción: Agregar campos geográficos y tabla de caché de direcciones

-- Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Modificar tabla sedes existente para agregar coordenadas
ALTER TABLE public.sedes 
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS radio_cobertura INTEGER DEFAULT 5000; -- metros

-- Actualizar coordenadas de sedes existentes
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

-- Crear tabla de direcciones validadas (caché)
CREATE TABLE public.direcciones_validadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direccion_original TEXT NOT NULL,
  direccion_formateada TEXT NOT NULL,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  ciudad VARCHAR(100),
  barrio VARCHAR(100),
  place_id VARCHAR(255),
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Modificar tabla pedidos para campos geográficos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS direccion_entrega TEXT,
ADD COLUMN IF NOT EXISTS latitud_entrega DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud_entrega DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS sede_asignada UUID REFERENCES sedes(id),
ADD COLUMN IF NOT EXISTS validacion_geografica BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distancia_metros INTEGER;

-- Crear índices para optimización de consultas geográficas
CREATE INDEX IF NOT EXISTS idx_sedes_coordinates ON sedes(latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_direcciones_cache ON direcciones_validadas(direccion_original);
CREATE INDEX IF NOT EXISTS idx_direcciones_expires ON direcciones_validadas(expires_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_geographic ON pedidos(latitud_entrega, longitud_entrega);

-- Habilitar RLS para nueva tabla
ALTER TABLE public.direcciones_validadas ENABLE ROW LEVEL SECURITY;

-- Políticas para direcciones validadas (acceso público para el chatbot)
CREATE POLICY "Direcciones son consultables públicamente" 
ON public.direcciones_validadas 
FOR SELECT 
USING (true);

CREATE POLICY "Direcciones pueden ser insertadas públicamente" 
ON public.direcciones_validadas 
FOR INSERT 
WITH CHECK (true);

-- Función para calcular distancia entre dos puntos geográficos
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL, lng1 DECIMAL, 
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS INTEGER AS $$
BEGIN 
  RETURN (
    6371000 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * 
      cos(radians(lng2) - radians(lng1)) + 
      sin(radians(lat1)) * sin(radians(lat2))
    )
  )::INTEGER;
EXCEPTION 
  WHEN OTHERS THEN
    -- Si hay error en el cálculo, retornar distancia máxima
    RETURN 999999;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar direcciones expiradas (mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_expired_addresses()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.direcciones_validadas 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE public.direcciones_validadas IS 'Caché de direcciones geocodificadas para evitar consultas repetidas a Google Maps API';
COMMENT ON COLUMN public.sedes.latitud IS 'Latitud de la sede en formato decimal';
COMMENT ON COLUMN public.sedes.longitud IS 'Longitud de la sede en formato decimal';
COMMENT ON COLUMN public.sedes.radio_cobertura IS 'Radio de cobertura de entrega en metros';
COMMENT ON COLUMN public.pedidos.validacion_geografica IS 'Indica si el pedido pasó la validación geográfica';
COMMENT ON COLUMN public.pedidos.distancia_metros IS 'Distancia en metros desde la sede asignada';