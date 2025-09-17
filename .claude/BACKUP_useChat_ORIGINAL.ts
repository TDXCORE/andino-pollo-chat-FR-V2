// BACKUP ORIGINAL - useChat.ts - FASE 1 INICIO
// Fecha: 2025-09-17
// Sección: Consulta de sedes (líneas 530-555)

// CÓDIGO ORIGINAL ANTES DE MODIFICACIONES:
/*
    // 4. CONSULTA DE SEDES (MANTENER LÓGICA EXISTENTE)
    if (lowerMessage.includes('sede') || lowerMessage.includes('dirección') || lowerMessage.includes('direccion') ||
        lowerMessage.includes('ubicación') || lowerMessage.includes('ubicacion') || lowerMessage.includes('horario') ||
        lowerMessage.includes('medellín') || lowerMessage.includes('medellin') || lowerMessage.includes('bogotá') ||
        lowerMessage.includes('bogota') || lowerMessage.includes('cali') || lowerMessage.includes('barranquilla')) {
      try {
        const { data: sedes } = await supabase
          .from('sedes')
          .select('*')
          .eq('activa', true);

        if (sedes && sedes.length > 0) {
          let response = '📍 **NUESTRAS SEDES:**\n\n';
          sedes.forEach(sede => {
            response += `**${sede.nombre}**\n🏠 ${sede.direccion}\n⏰ ${sede.horario}\n📞 ${sede.telefono}\n\n`;
          });
          response += '¿Te ayudo con algo más?';
          return response;
        }
      } catch (error) {
        return 'Error consultando sedes. Llámanos al (4) 123-4567';
      }
    }
*/

// COMPORTAMIENTO ACTUAL:
// - Muestra TODAS las sedes activas sin importar la ciudad solicitada
// - "Sedes en Medellín" → Muestra Bogotá, Cali, Barranquilla y Medellín
// - Necesita filtrado por ciudad específica

// ROLLBACK: Si hay problemas, restaurar este código exacto