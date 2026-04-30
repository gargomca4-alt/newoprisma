export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      finitions: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          price: number
          price_unit: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          price?: number
          price_unit?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          price?: number
          price_unit?: string
        }
        Relationships: []
      }
      paper_sizes: {
        Row: {
          active: boolean | null
          category: string
          created_at: string
          display_order: number | null
          height_mm: number
          id: string
          name: string
          width_mm: number
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string
          display_order?: number | null
          height_mm: number
          id?: string
          name: string
          width_mm: number
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string
          display_order?: number | null
          height_mm?: number
          id?: string
          name?: string
          width_mm?: number
        }
        Relationships: []
      }
      paper_types: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          price_per_sheet_sra3: number
          weight_prices: Json
          weights: number[]
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          price_per_sheet_sra3?: number
          weight_prices?: Json
          weights?: number[]
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          price_per_sheet_sra3?: number
          weight_prices?: Json
          weights?: number[]
        }
        Relationships: []
      }
      pelliculages: {
        Row: {
          active: boolean | null
          created_at: string
          display_order: number | null
          id: string
          name: string
          price_per_sqm: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          price_per_sqm?: number
        }
        Update: {
          active?: boolean | null
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          price_per_sqm?: number
        }
        Relationships: []
      }
      print_types: {
        Row: {
          active: boolean | null
          category: string
          cost_per_color: number
          cost_per_sheet: number
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          recto_verso_multiplier: number
          setup_cost: number
        }
        Insert: {
          active?: boolean | null
          category?: string
          cost_per_color?: number
          cost_per_sheet?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          recto_verso_multiplier?: number
          setup_cost?: number
        }
        Update: {
          active?: boolean | null
          category?: string
          cost_per_color?: number
          cost_per_sheet?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          recto_verso_multiplier?: number
          setup_cost?: number
        }
        Relationships: []
      }
      product_paper_types: {
        Row: {
          paper_type_id: string
          product_id: string
        }
        Insert: {
          paper_type_id: string
          product_id: string
        }
        Update: {
          paper_type_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_paper_types_paper_type_id_fkey"
            columns: ["paper_type_id"]
            isOneToOne: false
            referencedRelation: "paper_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_paper_types_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_print_types: {
        Row: {
          print_type_id: string
          product_id: string
        }
        Insert: {
          print_type_id: string
          product_id: string
        }
        Update: {
          print_type_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_print_types_print_type_id_fkey"
            columns: ["print_type_id"]
            isOneToOne: false
            referencedRelation: "print_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_print_types_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          display_order: number | null
          height_mm: number
          id: string
          name: string
          product_id: string | null
          width_mm: number
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          height_mm: number
          id?: string
          name: string
          product_id?: string | null
          width_mm: number
        }
        Update: {
          created_at?: string
          display_order?: number | null
          height_mm?: number
          id?: string
          name?: string
          product_id?: string | null
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string
          created_at: string
          default_size_h_mm: number | null
          default_size_w_mm: number | null
          description: string | null
          display_order: number | null
          has_cover: boolean | null
          has_pages: boolean | null
          id: string
          min_paper_weight: number | null
          name: string
          name_ar: string | null
          name_en: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string
          default_size_h_mm?: number | null
          default_size_w_mm?: number | null
          description?: string | null
          display_order?: number | null
          has_cover?: boolean | null
          has_pages?: boolean | null
          id?: string
          min_paper_weight?: number | null
          name: string
          name_ar?: string | null
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string
          default_size_h_mm?: number | null
          default_size_w_mm?: number | null
          description?: string | null
          display_order?: number | null
          has_cover?: boolean | null
          has_pages?: boolean | null
          id?: string
          min_paper_weight?: number | null
          name?: string
          name_ar?: string | null
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_company: string | null
          client_name: string
          created_at: string
          details: Json | null
          id: string
          product_name: string | null
          quantity: number | null
          total: number | null
        }
        Insert: {
          client_company?: string | null
          client_name: string
          created_at?: string
          details?: Json | null
          id?: string
          product_name?: string | null
          quantity?: number | null
          total?: number | null
        }
        Update: {
          client_company?: string | null
          client_name?: string
          created_at?: string
          details?: Json | null
          id?: string
          product_name?: string | null
          quantity?: number | null
          total?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
