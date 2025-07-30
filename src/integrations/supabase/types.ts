export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cedula: string
          created_at: string
          email: string | null
          id: string
          nombre: string
          puntos_acumulados: number | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cedula: string
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          puntos_acumulados?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cedula?: string
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          puntos_acumulados?: number | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          created_at: string
          es_usuario: boolean
          id: string
          mensaje: string
          metadata: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string
          es_usuario: boolean
          id?: string
          mensaje: string
          metadata?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string
          es_usuario?: boolean
          id?: string
          mensaje?: string
          metadata?: Json | null
          session_id?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cliente_cedula: string
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          created_at: string
          enviado_logistica: boolean | null
          estado: string | null
          fecha_pago: string | null
          id: string
          link_pago: string | null
          notas: string | null
          numero_pedido: string
          productos: Json
          total: number
          updated_at: string
        }
        Insert: {
          cliente_cedula: string
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          created_at?: string
          enviado_logistica?: boolean | null
          estado?: string | null
          fecha_pago?: string | null
          id?: string
          link_pago?: string | null
          notas?: string | null
          numero_pedido: string
          productos: Json
          total: number
          updated_at?: string
        }
        Update: {
          cliente_cedula?: string
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          created_at?: string
          enviado_logistica?: boolean | null
          estado?: string | null
          fecha_pago?: string | null
          id?: string
          link_pago?: string | null
          notas?: string | null
          numero_pedido?: string
          productos?: Json
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean | null
          categoria: string
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          nombre: string
          precio: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sedes: {
        Row: {
          activa: boolean | null
          ciudad: string
          codigo: string
          created_at: string
          direccion: string
          horario: string | null
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activa?: boolean | null
          ciudad: string
          codigo: string
          created_at?: string
          direccion: string
          horario?: string | null
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activa?: boolean | null
          ciudad?: string
          codigo?: string
          created_at?: string
          direccion?: string
          horario?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
