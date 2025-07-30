-- PASO 4: Crear funciones auxiliares
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

-- Probar la función de distancia
SELECT calculate_distance_meters(4.6769, -74.0508, 6.2442, -75.5812) as distancia_bogota_medellin_metros;