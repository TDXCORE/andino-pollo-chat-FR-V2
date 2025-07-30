-- PASO 3: Crear tablas de caché y modificar tabla pedidos
-- Ejecutar DESPUÉS del paso 2

-- Crear tabla de direcciones validadas (caché)
CREATE TABLE IF NOT EXISTS public.direcciones_validadas (
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

-- Comentarios para documentación
COMMENT ON TABLE public.direcciones_validadas IS 'Caché de direcciones geocodificadas para evitar consultas repetidas a Google Maps API';
COMMENT ON COLUMN public.pedidos.validacion_geografica IS 'Indica si el pedido pasó la validación geográfica';
COMMENT ON COLUMN public.pedidos.distancia_metros IS 'Distancia en metros desde la sede asignada';