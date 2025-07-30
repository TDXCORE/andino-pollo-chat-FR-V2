import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obtener API key desde las variables de entorno
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, session_id, conversation_history } = await req.json();

    // Inicializar Supabase client
    const supabaseUrl = 'https://dwjzifaxhuvqvjlxatnj.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3anppZmF4aHV2cXZqbHhhdG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODU4NDMsImV4cCI6MjA2ODM2MTg0M30.-KYCwWhZzLS6a_4HyLop_neu2hoxJRf1FFRVYi7nPcU';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sistema de prompts para el chatbot
    const systemPrompt = `Eres el asistente virtual de Pollos Andino, una empresa colombiana especializada en venta de pollos y productos avícolas. Tu personalidad es amigable, profesional y eficiente.

FUNCIONALIDADES PRINCIPALES:
1. Consulta de puntos por cédula
2. Disponibilidad de productos e inventario
3. Información de sedes (ubicación, horarios, contacto)
4. Captura de datos para pedidos
5. Generación de links de pago
6. Envío de información a logística

IMPORTANTE:
- Siempre responde en español colombiano
- Sé conciso pero amigable
- Si necesitas datos específicos (como cédula), pídelos directamente
- Para pedidos, solicita: nombre, cédula, teléfono, email, dirección
- Confirma siempre los datos antes de procesar

PRODUCTOS DISPONIBLES:
- Pollo Entero ($15.000)
- Pechuga de Pollo ($18.000)
- Muslos de Pollo ($12.000)
- Alas de Pollo ($8.000)
- Huevos AA 30 unidades ($12.000)
- Huevos Campesinos 12 unidades ($8.000)

SEDES:
- Medellín Centro: Carrera 50 # 45-30 (Lunes a Sábado 8AM-8PM)
- Bogotá Norte: Calle 85 # 15-20 (Lunes a Domingo 7AM-9PM)
- Cali Sur: Avenida 6N # 28-50 (Lunes a Sábado 8AM-8PM)
- Barranquilla: Carrera 53 # 72-15 (Lunes a Sábado 8AM-7PM)`;

    // Construir contexto de conversación
    const conversationContext = conversation_history?.map((msg: any) => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.message
    })) || [];

    // Procesar diferentes tipos de consultas
    let response = '';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('puntos') || lowerMessage.includes('cedula') || lowerMessage.includes('cédula')) {
      // Extraer número de cédula si está presente
      const cedulaMatch = message.match(/\d{7,10}/);
      if (cedulaMatch) {
        const cedula = cedulaMatch[0];
        try {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('cedula', cedula)
            .single();

          if (cliente) {
            response = `Hola ${cliente.nombre}! 🎉\n\nTus puntos acumulados son: **${cliente.puntos_acumulados} puntos**\n\n¿Te gustaría hacer un pedido o consultar algo más?`;
          } else {
            response = `No encontré información para la cédula ${cedula}. Por favor verifica el número o regístrate en cualquiera de nuestras sedes para comenzar a acumular puntos.`;
          }
        } catch (error) {
          response = `Hubo un error al consultar tus puntos. Por favor intenta nuevamente.`;
        }
      } else {
        response = `Para consultar tus puntos, necesito tu número de cédula. Por favor escríbela y te ayudo inmediatamente.`;
      }
    } else if (lowerMessage.includes('productos') || lowerMessage.includes('disponib') || lowerMessage.includes('stock') || lowerMessage.includes('precio')) {
      try {
        const { data: productos } = await supabase
          .from('productos')
          .select('*')
          .eq('activo', true);

        if (productos && productos.length > 0) {
          response = `🐔 **PRODUCTOS DISPONIBLES:**\n\n`;
          productos.forEach(prod => {
            response += `**${prod.nombre}**\n`;
            response += `Precio: $${prod.precio.toLocaleString('es-CO')}\n`;
            response += `Stock: ${prod.stock} unidades\n`;
            if (prod.descripcion) response += `${prod.descripcion}\n`;
            response += `\n`;
          });
          response += `¿Te interesa algún producto en particular?`;
        }
      } catch (error) {
        response = `Error al consultar productos. Por favor intenta nuevamente.`;
      }
    } else if (lowerMessage.includes('sedes') || lowerMessage.includes('ubicación') || lowerMessage.includes('dirección') || lowerMessage.includes('horario')) {
      try {
        const { data: sedes } = await supabase
          .from('sedes')
          .select('*')
          .eq('activa', true);

        if (sedes && sedes.length > 0) {
          response = `📍 **NUESTRAS SEDES:**\n\n`;
          sedes.forEach(sede => {
            response += `**${sede.nombre}**\n`;
            response += `📍 ${sede.direccion}\n`;
            response += `📞 ${sede.telefono || 'Sin teléfono'}\n`;
            response += `🕒 ${sede.horario}\n\n`;
          });
          response += `¿Necesitas direcciones específicas o información adicional?`;
        }
      } catch (error) {
        response = `Error al consultar sedes. Por favor intenta nuevamente.`;
      }
    } else {
      // Usar OpenAI para respuestas generales
      try {
        const response_ai = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationContext,
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 500
          }),
        });

        const data = await response_ai.json();
        
        if (data.error) {
          response = `Lo siento, hubo un problema con el servicio de IA. Puedes preguntar por nuestros productos, sedes o consultar tus puntos proporcionando tu cédula.`;
        } else {
          response = data.choices[0].message.content;
        }
      } catch (error) {
        console.error('OpenAI Error:', error);
        response = `Gracias por tu mensaje. Puedes preguntar por nuestros productos, sedes o consultar tus puntos proporcionando tu cédula.`;
      }
    }

    return new Response(JSON.stringify({ 
      response,
      session_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      response: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta nuevamente.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});