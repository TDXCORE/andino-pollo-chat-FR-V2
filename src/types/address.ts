// Tipos para el sistema de validación geográfica
// Fecha: 2025-07-30

export interface AddressSuggestion {
  formatted: string;
  placeId: string;
  coordinates: { lat: number; lng: number };
  confidence: number;
  components: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    department?: string;
  };
}

export interface AddressValidationResult {
  isValid: boolean;
  suggestions: AddressSuggestion[];
  fromCache: boolean;
  error?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'INTERNAL_ERROR';
}

export interface SedeInfo {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  ciudad: string;
}

export interface LocationValidationResult {
  within_radius: boolean;
  nearest_sede: SedeInfo;
  distance_meters: number;
  estimated_delivery_time: string;
  nearest_sedes: Array<{
    id: string;
    nombre: string;
    direccion: string;
    ciudad: string;
    distance_meters: number;
    within_radius: boolean;
  }>;
  coverage_available: boolean;
  validated_address: string;
}

// Estados del chat para el flujo de validación de direcciones
export type ChatStep = 
  | 'initial' 
  | 'waiting_for_address' 
  | 'confirming_address' 
  | 'validating_location' 
  | 'taking_order';

export interface PendingAddress {
  original: string;
  suggestions: AddressSuggestion[];
  confirmed?: AddressSuggestion;
}

export interface DeliveryInfo {
  address: AddressSuggestion;
  sede: SedeInfo;
  distance: number;
}

export interface ChatState {
  currentStep: ChatStep;
  pendingAddress?: PendingAddress;
  deliveryInfo?: DeliveryInfo;
}

// Tipos para mensajes de chat con soporte para validación geográfica
export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: string[];
  metadata?: {
    addressSuggestions?: AddressSuggestion[];
    validationResult?: LocationValidationResult;
    errorType?: string;
  };
}

// Tipos para respuestas de validación de dirección
export interface AddressConfirmationResponse {
  type: 'high_confidence_confirmation' | 'multiple_options' | 'low_confidence_confirmation' | 'error';
  message: string;
  quickReplies: string[];
  addressData?: AddressSuggestion;
  suggestions?: AddressSuggestion[];
}

// Constantes para mensajes de error
export const ERROR_MESSAGES = {
  INVALID_FORMAT: '🤔 Tu dirección es muy general. Por favor incluye más detalles como el número de la casa y el barrio.\n\n💡 Ejemplo: Carrera 15 # 93-07, Chapinero, Bogotá',
  NOT_FOUND: '❌ No encontré esa dirección. ¿Podrías verificar la ortografía y incluir más detalles?',
  INTERNAL_ERROR: '⚠️ Tengo problemas verificando la dirección. ¿Podrías intentar de nuevo?',
  OUTSIDE_COLOMBIA: '🌎 Solo hacemos entregas dentro de Colombia. ¿La dirección está en el país?'
} as const;

// Tipos para configuración de geocodificación
export interface GeocodingConfig {
  enableGeolocation: boolean;
  defaultDeliveryRadius: number;
  maxSuggestions: number;
  cacheExpirationDays: number;
}

// Tipo para estadísticas de validación (opcional, para métricas)
export interface ValidationStats {
  totalValidations: number;
  successfulValidations: number;
  cacheHits: number;
  averageConfidence: number;
  mostCommonErrors: string[];
}