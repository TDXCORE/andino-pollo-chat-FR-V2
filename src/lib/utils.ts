import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detecta la ciudad específica mencionada en el mensaje del usuario
 * @param mensaje - Mensaje del usuario en minúsculas
 * @returns string | null - Ciudad detectada o null si no hay ciudad específica
 */
export function detectarCiudadEnMensaje(mensaje: string): string | null {
  // Mapa de variaciones de nombres de ciudades
  const ciudades = {
    'medellín': ['medellín', 'medellin', 'antioquia'],
    'bogotá': ['bogotá', 'bogota', 'cundinamarca'],
    'cali': ['cali', 'valle del cauca', 'valle'],
    'barranquilla': ['barranquilla', 'atlántico', 'atlantico']
  };

  // Buscar cada ciudad y sus variaciones
  for (const [ciudadPrincipal, variaciones] of Object.entries(ciudades)) {
    for (const variacion of variaciones) {
      if (mensaje.includes(variacion)) {
        console.log(`Ciudad detectada: ${ciudadPrincipal} (variación: ${variacion})`);
        return ciudadPrincipal;
      }
    }
  }

  console.log('No se detectó ciudad específica en:', mensaje);
  return null;
}
