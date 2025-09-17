-- Migración para agregar factor urbano a las sedes
-- Fecha: 2025-09-17
-- Descripción: FASE 2.1 - Agregar factores de corrección urbana para mejorar precisión geográfica

-- Agregar columna factor_urbano a la tabla sedes
ALTER TABLE public.sedes
ADD COLUMN IF NOT EXISTS factor_urbano DECIMAL(3,1) DEFAULT 1.0;

-- Actualizar factores urbanos por ciudad basados en densidad y complejidad vial
-- Medellín: Alta densidad urbana, geografía montañosa = factor 2.1
UPDATE public.sedes SET factor_urbano = 2.1 WHERE ciudad ILIKE '%medellín%' OR ciudad ILIKE '%medellin%';

-- Bogotá: Muy alta densidad, tráfico complejo = factor 1.8
UPDATE public.sedes SET factor_urbano = 1.8 WHERE ciudad ILIKE '%bogotá%' OR ciudad ILIKE '%bogota%';

-- Cali: Densidad media-alta, geografía valle = factor 1.6
UPDATE public.sedes SET factor_urbano = 1.6 WHERE ciudad ILIKE '%cali%';

-- Barranquilla: Densidad media, geografía plana = factor 1.4
UPDATE public.sedes SET factor_urbano = 1.4 WHERE ciudad ILIKE '%barranquilla%';

-- Cartagena: Densidad media, centro histórico complejo = factor 1.5
UPDATE public.sedes SET factor_urbano = 1.5 WHERE ciudad ILIKE '%cartagena%';

-- Bucaramanga: Densidad media, geografía montañosa = factor 1.7
UPDATE public.sedes SET factor_urbano = 1.7 WHERE ciudad ILIKE '%bucaramanga%';

-- Pereira: Densidad media-baja, geografía montañosa = factor 1.6
UPDATE public.sedes SET factor_urbano = 1.6 WHERE ciudad ILIKE '%pereira%';

-- Manizales: Densidad media, geografía muy montañosa = factor 1.9
UPDATE public.sedes SET factor_urbano = 1.9 WHERE ciudad ILIKE '%manizales%';

-- Villavicencio: Densidad baja-media, geografía llana = factor 1.3
UPDATE public.sedes SET factor_urbano = 1.3 WHERE ciudad ILIKE '%villavicencio%';

-- Santa Marta: Densidad baja-media, costa = factor 1.2
UPDATE public.sedes SET factor_urbano = 1.2 WHERE ciudad ILIKE '%santa marta%';

-- Agregar comentario explicativo
COMMENT ON COLUMN public.sedes.factor_urbano IS 'Factor de corrección urbana para ajustar distancias según densidad y complejidad de la ciudad (1.0 = rural, 2.5 = muy urbano)';

-- Crear función para calcular distancia con factor urbano
CREATE OR REPLACE FUNCTION calculate_distance_with_urban_factor(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL,
  urban_factor DECIMAL DEFAULT 1.0
) RETURNS INTEGER AS $$
DECLARE
  base_distance INTEGER;
  adjusted_distance INTEGER;
BEGIN
  -- Calcular distancia base usando fórmula de Haversine
  base_distance := (
    6371000 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) *
      cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  )::INTEGER;

  -- Aplicar factor urbano con límites razonables
  adjusted_distance := (base_distance * LEAST(urban_factor, 3.0))::INTEGER;

  RETURN adjusted_distance;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error en el cálculo, retornar distancia máxima
    RETURN 999999;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar para obtener factor urbano por ciudad
CREATE OR REPLACE FUNCTION get_urban_factor_by_city(city_name TEXT)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE
    WHEN city_name ILIKE '%medellín%' OR city_name ILIKE '%medellin%' THEN 2.1
    WHEN city_name ILIKE '%bogotá%' OR city_name ILIKE '%bogota%' THEN 1.8
    WHEN city_name ILIKE '%cali%' THEN 1.6
    WHEN city_name ILIKE '%barranquilla%' THEN 1.4
    WHEN city_name ILIKE '%cartagena%' THEN 1.5
    WHEN city_name ILIKE '%bucaramanga%' THEN 1.7
    WHEN city_name ILIKE '%pereira%' THEN 1.6
    WHEN city_name ILIKE '%manizales%' THEN 1.9
    WHEN city_name ILIKE '%villavicencio%' THEN 1.3
    WHEN city_name ILIKE '%santa marta%' THEN 1.2
    ELSE 1.0 -- Factor por defecto para otras ciudades
  END;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION calculate_distance_with_urban_factor IS 'Calcula distancia entre dos puntos aplicando factor de corrección urbana';
COMMENT ON FUNCTION get_urban_factor_by_city IS 'Retorna el factor urbano apropiado para una ciudad específica';

-- Validar que los datos se actualizaron correctamente
DO $$
BEGIN
  RAISE NOTICE 'Factores urbanos actualizados:';
  RAISE NOTICE 'Sedes con factor urbano: %', (SELECT COUNT(*) FROM sedes WHERE factor_urbano > 1.0);
  RAISE NOTICE 'Rango de factores: % - %',
    (SELECT MIN(factor_urbano) FROM sedes),
    (SELECT MAX(factor_urbano) FROM sedes);
END $$;