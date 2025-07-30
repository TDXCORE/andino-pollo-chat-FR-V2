-- PASO 1: Agregar columnas geográficas a tabla sedes
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Agregar columnas de coordenadas y radio de cobertura
ALTER TABLE public.sedes 
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS radio_cobertura INTEGER DEFAULT 5000;

-- Comentarios para documentación
COMMENT ON COLUMN public.sedes.latitud IS 'Latitud de la sede en formato decimal';
COMMENT ON COLUMN public.sedes.longitud IS 'Longitud de la sede en formato decimal';
COMMENT ON COLUMN public.sedes.radio_cobertura IS 'Radio de cobertura de entrega en metros';