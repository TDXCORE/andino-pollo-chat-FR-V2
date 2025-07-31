import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addressValidator, formatDistance } from "@/lib/addressValidator";
import type { 
  ChatState, 
  AddressSuggestion, 
  AddressValidationResult, 
  LocationValidationResult,
  ChatMessage
} from "@/types/address";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const SYSTEM_PROMPT = `Eres el asistente de Pollos Andino, una pollería colombiana. Responde de forma natural, breve y amigable como un vendedor real.

TIENES ACCESO COMPLETO A LA BASE DE DATOS PARA:
✅ Consultar puntos de clientes por cédula
✅ Mostrar productos disponibles y precios actuales
✅ Consultar sedes, direcciones y horarios
✅ Crear pedidos con validación geográfica automática
✅ Registrar clientes nuevos automáticamente

DETECCIÓN EXACTA DE INTENCIONES:
1. PUNTOS: Solo si mencionan "puntos" (NUNCA confundir con "productos disponibles")
2. PRODUCTOS: Solo si mencionan "productos", "precios", "cuánto cuesta" SIN mencionar "puntos"  
3. SEDES: Solo si mencionan "sede", "dirección", "horario", nombre de ciudad
4. PEDIDOS: Solo si quieren "comprar", "pedir", "hacer pedido", "domicilio"

NUEVO: VALIDACIÓN GEOGRÁFICA AUTOMÁTICA
- Para pedidos a domicilio, validas automáticamente la dirección
- Solo entregas dentro del radio de 5km de las sedes
- Muestras opciones de sedes cercanas si está fuera del radio

IMPORTANTE: Usa SIEMPRE la información real de la base de datos, no inventes datos.`;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      message: "¡Hola! Soy el asistente virtual de Pollos Andino. Puedo ayudarte con:\n\n• Consultar tus puntos acumulados\n• Ver disponibilidad de productos\n• Información de nuestras sedes\n• **Realizar pedidos con entrega a domicilio** 🚚\n\n¿En qué puedo ayudarte hoy?",
      isUser: false,
      timestamp: new Date(),
      quickReplies: ['🍗 Ver productos', '📍 Pedido a domicilio', '⭐ Consultar puntos', '🏪 Ver sedes']
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [chatState, setChatState] = useState<ChatState>({ currentStep: 'initial' });
  const { toast } = useToast();

  // Auto-reset del estado después de 5 minutos de inactividad
  const resetChatStateTimeout = () => {
    setTimeout(() => {
      setChatState(prev => {
        if (prev.currentStep !== 'initial') {
          console.log('Auto-resetting chat state due to inactivity');
          return { currentStep: 'initial' };
        }
        return prev;
      });
    }, 300000); // 5 minutos
  };

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const saveConversation = async (message: string, isUser: boolean) => {
    try {
      await supabase
        .from('conversaciones')
        .insert({
          session_id: sessionId,
          mensaje: message,
          es_usuario: isUser
        });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  // === LÓGICA DE VALIDACIÓN DE DIRECCIONES ===
  
  const handleAddressInput = async (userMessage: string) => {
    addMessage({
      message: '🔍 Validando tu dirección...',
      isUser: false,
      timestamp: new Date()
    });

    try {
      const validationResult = await addressValidator.validateAddress(userMessage);
      await handleAddressValidationResult(validationResult, userMessage);
    } catch (error) {
      console.error('Address validation error:', error);
      addMessage({
        message: '⚠️ Tengo problemas verificando la dirección. ¿Podrías intentar de nuevo?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['🔄 Intentar de nuevo', '📞 Hablar con agente']
      });
      // Resetear estado para permitir otras consultas
      setChatState({ currentStep: 'initial' });
    }
  };

  const handleAddressValidationResult = async (result: AddressValidationResult, originalInput: string) => {
    const confirmationResponse = addressValidator.generateConfirmationResponse(result, originalInput);
    
    addMessage({
      message: confirmationResponse.message,
      isUser: false,
      timestamp: new Date(),
      quickReplies: confirmationResponse.quickReplies,
      metadata: {
        addressSuggestions: confirmationResponse.suggestions || (confirmationResponse.addressData ? [confirmationResponse.addressData] : [])
      }
    });

    if (result.isValid) {
      setChatState({
        currentStep: 'confirming_address',
        pendingAddress: { 
          original: originalInput, 
          suggestions: confirmationResponse.suggestions || [confirmationResponse.addressData!].filter(Boolean)
        }
      });
    } else {
      setChatState({ currentStep: 'waiting_for_address' });
    }
  };

  const handleAddressConfirmation = async (userResponse: string) => {
    console.log('Processing address confirmation:', userResponse);
    const { pendingAddress } = chatState;
    if (!pendingAddress) {
      console.log('No pending address found');
      return;
    }

    const lowerResponse = userResponse.toLowerCase();
    
    // Detectar confirmación positiva - ampliado para capturar más variaciones
    const isConfirmation = lowerResponse.includes('sí') || 
                         lowerResponse.includes('si') ||
                         lowerResponse.includes('correcta') ||
                         lowerResponse.includes('correcto') ||
                         lowerResponse.includes('confirmado') ||
                         lowerResponse.includes('confirmo') ||
                         lowerResponse.includes('✅') ||
                         lowerResponse.includes('ok') ||
                         lowerResponse.includes('bien');

    // Detectar rechazo
    const isRejection = lowerResponse.includes('no') || 
                       lowerResponse.includes('❌') ||
                       lowerResponse.includes('incorrecto') ||
                       lowerResponse.includes('incorrecta');

    if (isConfirmation) {
      console.log('User confirmed address, starting location validation');
      // Usuario confirmó la dirección
      const confirmedAddress = pendingAddress.suggestions[0];
      setChatState(prev => ({
        ...prev,
        currentStep: 'validating_location',
        pendingAddress: { ...prev.pendingAddress!, confirmed: confirmedAddress }
      }));
      
      await validateDeliveryRadius(confirmedAddress);
      
    } else if (isRejection) {
      console.log('User rejected address, asking for new one');
      // Usuario rechazó - pedir dirección de nuevo
      setChatState({ currentStep: 'waiting_for_address' });
      addMessage({
        message: '📝 Por favor, escribe tu dirección de nuevo con más detalles:\n\n💡 Ejemplo: Carrera 15 # 93-07, Chapinero, Bogotá',
        isUser: false,
        timestamp: new Date()
      });
      
    } else if (['1️⃣', '2️⃣', '3️⃣'].includes(userResponse)) {
      console.log('User selected option:', userResponse);
      // Usuario seleccionó una opción específica
      const selectedIndex = parseInt(userResponse[0]) - 1;
      const selectedAddress = pendingAddress.suggestions[selectedIndex];
      
      if (selectedAddress) {
        setChatState(prev => ({
          ...prev,
          currentStep: 'validating_location',
          pendingAddress: { ...prev.pendingAddress!, confirmed: selectedAddress }
        }));
        
        await validateDeliveryRadius(selectedAddress);
      }
    } else {
      console.log('Response not recognized, prompting again');
      // Respuesta no reconocida - pedir confirmación más clara
      addMessage({
        message: '🤔 No entendí tu respuesta. Por favor confirma:\n\n¿Es correcta esta dirección?\n\n• Escribe "Sí" para confirmar\n• Escribe "No" para corregir',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['✅ Sí, es correcta', '❌ No, corregir']
      });
    }
  };

  const validateDeliveryRadius = async (confirmedAddress: AddressSuggestion) => {
    addMessage({
      message: '📍 Verificando cobertura de entrega...',
      isUser: false,
      timestamp: new Date()
    });

    try {
      console.log('Starting location validation for:', confirmedAddress);
      const validationResult = await addressValidator.validateLocation(confirmedAddress);
      console.log('Location validation result:', validationResult);

      if (validationResult.within_radius) {
        // ✅ Dentro del radio - continuar con pedido
        addMessage({
          message: `🎉 ¡Perfecto! Hacemos entregas en tu zona.\n\n` +
                  `🏪 Sede más cercana: **${validationResult.nearest_sede.nombre}**\n` +
                  `📏 Distancia: ${formatDistance(validationResult.distance_meters)}\n` +
                  `⏰ Tiempo estimado: ${validationResult.estimated_delivery_time}\n\n` +
                  `Ahora necesito algunos datos para tu pedido:\n📝 Escribe: **nombre, teléfono, producto**\n\n💡 Ejemplo: Juan Pérez, 3001234567, pollo entero`,
          isUser: false,
          timestamp: new Date(),
          quickReplies: ['🍗 Ver productos disponibles']
        });

        setChatState(prev => ({
          ...prev,
          currentStep: 'taking_order',
          deliveryInfo: {
            address: confirmedAddress,
            sede: validationResult.nearest_sede,
            distance: validationResult.distance_meters
          }
        }));

      } else {
        // ❌ Fuera del radio - mostrar alternativas
        const alternativesText = validationResult.nearest_sedes
          .slice(0, 2)
          .map(sede => `📍 **${sede.nombre}**: ${sede.direccion} (${formatDistance(sede.distance_meters)})`)
          .join('\n');

        addMessage({
          message: `😔 Lo sentimos, tu dirección está fuera de nuestra zona de entrega.\n\n` +
                  `📏 Distancia a la sede más cercana: ${formatDistance(validationResult.distance_meters)}\n` +
                  `🚚 Nuestro radio máximo es de 5km\n\n` +
                  `**Sedes más cercanas:**\n${alternativesText}\n\n` +
                  `💡 ¿Te gustaría recoger tu pedido en alguna de estas sedes?`,
          isUser: false,
          timestamp: new Date(),
          quickReplies: ['🏪 Ver todas las sedes', '📝 Cambiar dirección', '📞 Hablar con agente']
        });

        setChatState({ currentStep: 'initial' });
      }

    } catch (error) {
      console.error('Error validating delivery radius:', error);
      addMessage({
        message: '⚠️ Hubo un error verificando la cobertura. Por favor intenta de nuevo.',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['🔄 Reintentar', '📞 Hablar con agente']
      });
      
      // Resetear estado para permitir continuar
      setChatState({ currentStep: 'initial' });
    }
  };

  const handleOrderInput = async (userMessage: string): Promise<string> => {
    console.log('Processing order input:', userMessage);
    
    // Check if the message contains comma-separated data (nombre, telefono, producto)
    if (userMessage.includes(',')) {
      const parts = userMessage.split(',').map(p => p.trim());
      
      if (parts.length >= 2) {
        const nombre = parts[0];
        const telefono = parts[1];
        const producto = parts[2] || 'pollo entero';
        
        // Validate phone number format
        if (telefono.match(/\d{10}/)) {
          // Calculate price based on product
          let total = 15000;
          const productoLower = producto.toLowerCase();
          
          if (productoLower.includes('pechuga')) total = 18000;
          else if (productoLower.includes('muslos')) total = 12000;
          else if (productoLower.includes('alas')) total = 8000;
          else if (productoLower.includes('huevos aa')) total = 12000;
          else if (productoLower.includes('huevos campesinos')) total = 8000;
          
          const numeroPedido = `PL${Date.now()}`;
          
          try {
            // Register/update client
            await supabase.from('clientes').upsert({
              cedula: telefono,
              nombre: nombre,
              telefono: telefono,
              email: `${nombre.toLowerCase().replace(/\s+/g, '')}@temp.com`,
              puntos_acumulados: 0
            });
            
            // Create order
            const { error: pedidoError } = await supabase.from('pedidos').insert({
              numero_pedido: numeroPedido,
              cliente_cedula: telefono,
              cliente_nombre: nombre,
              cliente_telefono: telefono,
              cliente_email: `${nombre.toLowerCase().replace(/\s+/g, '')}@temp.com`,
              direccion_entrega: chatState.deliveryInfo!.address.formatted,
              latitud_entrega: chatState.deliveryInfo!.address.coordinates.lat,
              longitud_entrega: chatState.deliveryInfo!.address.coordinates.lng,
              sede_asignada: chatState.deliveryInfo!.sede.id,
              validacion_geografica: true,
              distancia_metros: chatState.deliveryInfo!.distance,
              productos: { detalle: producto, precio_unitario: total },
              total: total,
              estado: 'pendiente_pago'
            });

            if (!pedidoError) {
              const linkPago = `https://pagos.pollosandino.com/pagar/${numeroPedido}`;
              
              // Reset state to allow new orders
              setChatState({ currentStep: 'initial' });
              
              return `¡Listo ${nombre}! 🐔\n\n` +
                     `**Pedido #${numeroPedido}**\n` +
                     `${producto.charAt(0).toUpperCase() + producto.slice(1)} - $${total.toLocaleString('es-CO')}\n\n` +
                     `📍 **Entrega en:** ${chatState.deliveryInfo!.address.formatted}\n` +
                     `🏪 **Desde sede:** ${chatState.deliveryInfo!.sede.nombre}\n` +
                     `📏 **Distancia:** ${formatDistance(chatState.deliveryInfo!.distance)}\n` +
                     `⏰ **Tiempo estimado:** ${chatState.deliveryInfo!.sede.nombre.includes('Bogotá') ? '25-35' : '30-40'} minutos\n\n` +
                     `💳 **Link de pago:**\n${linkPago}\n\n` +
                     `¿Algo más en lo que pueda ayudarte?`;
            } else {
              return `❌ Error al crear el pedido. Llámanos al ${chatState.deliveryInfo?.sede.telefono || '(4) 123-4567'}`;
            }
          } catch (error) {
            console.error('Error creating order:', error);
            return `❌ Error al crear el pedido. Llámanos al ${chatState.deliveryInfo?.sede.telefono || '(4) 123-4567'}`;
          }
        } else {
          return `📱 El teléfono debe tener 10 dígitos. Por favor intenta de nuevo:\n\n📝 Formato: nombre, teléfono, producto\n💡 Ejemplo: Juan Pérez, 3001234567, pollo entero`;
        }
      } else {
        return `📝 Necesito más información. Por favor usa este formato:\n\n**nombre, teléfono, producto**\n💡 Ejemplo: Juan Pérez, 3001234567, pollo entero`;
      }
    } else {
      // Handle single responses or quick replies
      if (userMessage.toLowerCase().includes('productos disponibles') || userMessage.toLowerCase().includes('ver productos')) {
        try {
          const { data: productos } = await supabase
            .from('productos')
            .select('*')
            .eq('activo', true);

          if (productos && productos.length > 0) {
            let response = '🐔 **PRODUCTOS DISPONIBLES:**\n\n';
            productos.forEach(prod => {
              const disponible = prod.stock > 0 ? '✅ Disponible' : '❌ Agotado';
              response += `**${prod.nombre}**: $${prod.precio.toLocaleString('es-CO')} - ${disponible}\n`;
            });
            response += '\n📝 Para hacer tu pedido, escribe:\n**nombre, teléfono, producto**\n💡 Ejemplo: Juan Pérez, 3001234567, pollo entero';
            return response;
          }
        } catch (error) {
          return 'Error consultando productos. Llámanos al (4) 123-4567';
        }
      }
      
      return `📝 Para continuar con tu pedido, necesito estos datos en este formato:\n\n**nombre, teléfono, producto**\n💡 Ejemplo: Juan Pérez, 3001234567, pollo entero\n\n🍗 O escribe "ver productos" para ver el menú disponible`;
    }
  };

  // === LÓGICA EXISTENTE MODIFICADA ===

  const processSpecialCases = async (userMessage: string): Promise<string | null> => {
    const lowerMessage = userMessage.toLowerCase();

    // Comando de escape: permitir salir del flujo de direcciones
    if (['cancelar', 'salir', 'menu', 'inicio', 'volver'].some(cmd => lowerMessage.includes(cmd))) {
      setChatState({ currentStep: 'initial' });
      return "¡Perfecto! ¿En qué más puedo ayudarte?\n\n• 🍗 Ver productos\n• 📍 Pedido a domicilio\n• ⭐ Consultar puntos\n• 🏪 Ver sedes";
    }

    // Manejo específico de "Cambiar dirección"
    if (lowerMessage.includes('cambiar dirección') || lowerMessage.includes('cambiar direccion')) {
      setChatState({ currentStep: 'waiting_for_address' });
      return "📝 Perfecto, escribe tu nueva dirección completa:\n\n💡 Ejemplo: Carrera 15 # 93-07, Chapinero, Bogotá";
    }

    // Manejo de estados de dirección
    if (chatState.currentStep === 'waiting_for_address') {
      await handleAddressInput(userMessage);
      return "HANDLED";
    }

    if (chatState.currentStep === 'confirming_address') {
      await handleAddressConfirmation(userMessage);
      return "HANDLED";
    }

    if (chatState.currentStep === 'taking_order') {
      return await handleOrderInput(userMessage);
    }

    // Handle order input from users who haven't gone through address validation
    if (userMessage.includes(',') && chatState.currentStep === 'initial') {
      const parts = userMessage.split(',').map(p => p.trim());
      
      if (parts.length >= 2) {
        const nombre = parts[0];
        
        addMessage({
          message: `Perfecto ${nombre}, ahora necesito tu dirección completa para verificar si hacemos entrega en tu zona.\n\n📝 Por favor escribe tu dirección completa:\n💡 Ejemplo: Carrera 15 # 93-07, Chapinero, Bogotá`,
          isUser: false,
          timestamp: new Date()
        });
        
        setChatState({ currentStep: 'waiting_for_address' });
        return "HANDLED";
      }
    }

    // Detección de intención de pedido a domicilio
    if ((lowerMessage.includes('pedido') || lowerMessage.includes('pedir') || lowerMessage.includes('domicilio') || 
         lowerMessage.includes('entrega') || lowerMessage.includes('📍') || lowerMessage.includes('hacer pedido')) && 
         chatState.currentStep === 'initial') {
      
      addMessage({
        message: '🍗 ¡Perfecto! Para hacer tu pedido con entrega a domicilio necesito validar la dirección.\n\n📝 Por favor escribe tu dirección completa:\n💡 Ejemplo: Carrera 15 # 93-07, Chapinero, Bogotá',
        isUser: false,
        timestamp: new Date()
      });
      
      setChatState({ currentStep: 'waiting_for_address' });
      return "HANDLED";
    }

    // 2. CONSULTA DE PUNTOS (MANTENER LÓGICA EXISTENTE)
    if (lowerMessage.includes('puntos') && !lowerMessage.includes('productos')) {
      const cedulaMatch = userMessage.match(/\d{7,10}/);
      if (!cedulaMatch) {
        return `Para consultar tus puntos necesito tu cédula. ¿Me la puedes dar?`;
      }
      
      const cedula = cedulaMatch[0];
      try {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nombre, puntos_acumulados')
          .eq('cedula', cedula)
          .single();

        if (cliente) {
          return `¡Hola ${cliente.nombre}! 🎉\n\nTus puntos acumulados: **${cliente.puntos_acumulados} puntos**\n\n¿Te ayudo con algo más?`;
        } else {
          return `No encontré la cédula ${cedula}. ¿Quieres registrarte? Solo dime: nombre, teléfono, dirección`;
        }
      } catch (error) {
        return `Error consultando puntos. Intenta de nuevo.`;
      }
    }

    // 2b. CONSULTA DE PUNTOS SOLO CON CÉDULA
    const cedulaSolaMatch = userMessage.match(/^\d{7,10}$/);
    if (cedulaSolaMatch) {
      const cedula = cedulaSolaMatch[0];
      try {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nombre, puntos_acumulados')
          .eq('cedula', cedula)
          .single();

        if (cliente) {
          return `¡Hola ${cliente.nombre}! 🎉\n\nTus puntos acumulados: **${cliente.puntos_acumulados} puntos**\n\n¿Te ayudo con algo más?`;
        } else {
          return `No encontré la cédula ${cedula}. ¿Quieres registrarte haciendo un pedido?`;
        }
      } catch (error) {
        return `Error consultando puntos. Intenta de nuevo.`;
      }
    }

    // 3. CONSULTA DE PRODUCTOS (MANTENER LÓGICA EXISTENTE)
    if ((lowerMessage.includes('producto') || lowerMessage.includes('disponib') || lowerMessage.includes('precio') || 
         lowerMessage.includes('pollo') && (lowerMessage.includes('cuesta') || lowerMessage.includes('precio')) ||
         lowerMessage.includes('cuánto') || lowerMessage.includes('cuanto')) && 
         !lowerMessage.includes('puntos')) {
      try {
        const { data: productos } = await supabase
          .from('productos')
          .select('*')
          .eq('activo', true);

        if (productos && productos.length > 0) {
          let response = '🐔 **PRODUCTOS DISPONIBLES:**\n\n';
          productos.forEach(prod => {
            const disponible = prod.stock > 0 ? '✅ Disponible' : '❌ Agotado';
            response += `**${prod.nombre}**: $${prod.precio.toLocaleString('es-CO')} - ${disponible}\n`;
          });
          response += '\n¿Quieres hacer un pedido a domicilio? 🚚';
          return response;
        }
      } catch (error) {
        return 'Error consultando productos. Llámanos al (4) 123-4567';
      }
    }

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

    return null;
  };

  const sendMessage = useCallback(async (userMessage: string) => {
    console.log('Sending message:', userMessage);
    console.log('Current chat state:', chatState);
    
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      message: userMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    await saveConversation(userMessage, true);

    try {
      const specialResponse = await processSpecialCases(userMessage);
      console.log('Special response result:', specialResponse);
      
      if (specialResponse && specialResponse !== "HANDLED") {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: specialResponse,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        await saveConversation(specialResponse, false);
      } else if (specialResponse !== "HANDLED") {
        // Usar OpenAI para otros casos generales
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-5).map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.message
              })),
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 600
          }),
        });

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: aiResponse,
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        await saveConversation(aiResponse, false);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta nuevamente.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Verifica tu conexión e intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, chatState, toast]);

  return {
    messages,
    isLoading,
    sendMessage,
    chatState,
    setChatState
  };
}