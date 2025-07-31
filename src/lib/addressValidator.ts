// Servicio de validación de direcciones geográficas
// Integra con las Edge Functions de Supabase
// Fecha: 2025-07-30

import { supabase } from '@/integrations/supabase/client';
import type { 
  AddressValidationResult, 
  LocationValidationResult, 
  AddressSuggestion,
  AddressConfirmationResponse 
} from '@/types/address';

export class AddressValidator {
  private readonly maxRetries = 2;
  private readonly timeoutMs = 10000; // 10 segundos

  /**
   * Valida una dirección usando la función de geocodificación
   */
  async validateAddress(address: string): Promise<AddressValidationResult> {
    if (!address || typeof address !== 'string') {
      return {
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INVALID_FORMAT'
      };
    }

    // Limpiar entrada
    const cleanedAddress = this.cleanAddress(address);
    
    if (!this.isValidAddressFormat(cleanedAddress)) {
      return {
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INVALID_FORMAT'
      };
    }

    try {
      const { data, error } = await this.callWithRetry('geocode', {
        address: cleanedAddress
      });

      if (error) {
        console.error('Geocoding error:', error);
        return {
          isValid: false,
          suggestions: [],
          fromCache: false,
          error: 'INTERNAL_ERROR'
        };
      }

      return data as AddressValidationResult;
    } catch (error) {
      console.error('Address validation error:', error);
      return {
        isValid: false,
        suggestions: [],
        fromCache: false,
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Valida si una ubicación específica está dentro del radio de cobertura
   */
  async validateLocation(suggestion: AddressSuggestion): Promise<LocationValidationResult> {
    try {
      const { data, error } = await this.callWithRetry('validate-location', {
        latitude: suggestion.coordinates.lat,
        longitude: suggestion.coordinates.lng,
        formatted_address: suggestion.formatted
      });

      if (error) {
        console.error('Location validation error:', error);
        throw new Error(`Error validando ubicación: ${error.message || 'Error desconocido'}`);
      }

      return data as LocationValidationResult;
    } catch (error) {
      console.error('Location validation error:', error);
      throw error;
    }
  }

  /**
   * Genera una respuesta de confirmación inteligente basada en el resultado de validación
   */
  generateConfirmationResponse(
    result: AddressValidationResult, 
    originalInput: string
  ): AddressConfirmationResponse {
    if (!result.isValid) {
      const errorMessage = this.getErrorMessage(result.error);
      return {
        type: 'error',
        message: errorMessage,
        quickReplies: ['🔄 Intentar de nuevo', '📞 Hablar con agente']
      };
    }

    const suggestions = result.suggestions;
    
    // Caso 1: Alta confianza - Confirmar directamente
    if (suggestions.length === 1 && suggestions[0].confidence > 0.8) {
      return {
        type: 'high_confidence_confirmation',
        message: `✅ Encontré tu dirección:\n\n📍 **${suggestions[0].formatted}**\n\n¿Es correcta esta dirección?`,
        quickReplies: ['✅ Sí, es correcta', '❌ No, corregir'],
        addressData: suggestions[0]
      };
    }

    // Caso 2: Múltiples opciones - Mostrar para selección
    if (suggestions.length > 1) {
      const optionsText = suggestions
        .slice(0, 3)
        .map((suggestion, index) => `${index + 1}. ${suggestion.formatted}`)
        .join('\n');

      return {
        type: 'multiple_options',
        message: `🔍 Encontré varias direcciones similares:\n\n${optionsText}\n\nSelecciona el número de la dirección correcta:`,
        quickReplies: ['1️⃣', '2️⃣', '3️⃣', '❌ Ninguna es correcta'],
        suggestions: suggestions.slice(0, 3)
      };
    }

    // Caso 3: Baja confianza - Pedir confirmación con detalles
    return {
      type: 'low_confidence_confirmation',
      message: `🤔 Creo que encontré tu dirección, pero quiero confirmar:\n\n📍 **${suggestions[0].formatted}**\n\n¿Es esta la dirección correcta?`,
      quickReplies: ['✅ Sí, es correcta', '❌ No, escribir de nuevo'],
      addressData: suggestions[0]
    };
  }

  /**
   * Calcula la confianza de una dirección basada en similitud
   */
  calculateConfidence(original: string, formatted: string): 'high' | 'medium' | 'low' {
    const similarity = this.stringSimilarity(original.toLowerCase(), formatted.toLowerCase());
    
    if (similarity > 0.8) return 'high';
    if (similarity > 0.6) return 'medium';
    return 'low';
  }

  // === MÉTODOS PRIVADOS ===

  private cleanAddress(address: string): string {
    return address
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios → un espacio
      .replace(/[^\w\s#\-\.]/g, '') // Remover caracteres especiales excepto # - .
      .toLowerCase();
  }

  private isValidAddressFormat(address: string): boolean {
    // Validaciones básicas para direcciones colombianas
    const patterns = [
      /\b(calle|carrera|diagonal|transversal|avenida|av|kr|cl|cra|car|cll|dg|tv)\b/i,
      /\d+/, // Debe contener al menos un número
    ];

    const hasRoadType = patterns[0].test(address);
    const hasNumber = patterns[1].test(address);

    return hasRoadType && hasNumber;
  }

  private getErrorMessage(error?: string): string {
    const errorMessages = {
      INVALID_FORMAT: '🤔 Tu dirección es muy general. Por favor incluye más detalles como el número de la casa y el barrio.\n\n💡 Ejemplo: Carrera 15 # 93-07, Chapinero, Bogotá',
      NOT_FOUND: '❌ No encontré esa dirección. ¿Podrías verificar la ortografía y incluir más detalles?',
      INTERNAL_ERROR: '⚠️ Tengo problemas verificando la dirección. ¿Podrías intentar de nuevo?',
      OUTSIDE_COLOMBIA: '🌎 Solo hacemos entregas dentro de Colombia. ¿La dirección está en el país?'
    };

    return errorMessages[error as keyof typeof errorMessages] || errorMessages.INTERNAL_ERROR;
  }

  private async callWithRetry(functionName: string, payload: any): Promise<{ data: any; error: any }> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Calling ${functionName}, attempt ${attempt}/${this.maxRetries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        // Usar fetch directo en lugar de supabase.functions.invoke
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          console.error(`${functionName} error (attempt ${attempt}):`, lastError);
          
          if (attempt === this.maxRetries) {
            return { data: null, error: lastError };
          }
          
          await this.delay(1000 * attempt);
          continue;
        }

        const data = await response.json();
        return { data, error: null };

      } catch (error) {
        lastError = error;
        console.error(`${functionName} exception (attempt ${attempt}):`, error);
        
        if (attempt === this.maxRetries) {
          return { data: null, error: lastError };
        }
        
        await this.delay(1000 * attempt);
      }
    }

    return { data: null, error: lastError };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Instancia singleton del validador
export const addressValidator = new AddressValidator();

// Función auxiliar para formatear distancias
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  } else {
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  }
}

// Función auxiliar para determinar si una dirección está en formato colombiano
export function isColombianAddressFormat(address: string): boolean {
  const patterns = [
    /\b(calle|carrera|diagonal|transversal|avenida|av|kr|cl|cra|car|cll|dg|tv)\b/i,
    /\d+/,
    /#/
  ];

  return patterns.some(pattern => pattern.test(address));
}