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
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          tips_amount: number
          tips_rate: number
          total: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          price?: number
          product_id?: string | null
          product_name: string
          quantity?: number
          tips_amount?: number
          tips_rate?: number
          total?: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          tips_amount?: number
          tips_rate?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          cash_amount: number
          company_id: string
          company_name: string
          created_at: string
          driver_name: string
          id: string
          invoice_number: string | null
          outstanding_amount: number
          paid_amount: number
          pass_amount: number
          pass_enabled: boolean
          payment_mode: string
          split_payment: boolean
          tips_amount: number
          tips_rate: number
          total_amount: number
          updated_at: string
          upi_amount: number
          vehicle_capacity: number
          vehicle_number: string
        }
        Insert: {
          cash_amount?: number
          company_id: string
          company_name: string
          created_at?: string
          driver_name?: string
          id?: string
          invoice_number?: string | null
          outstanding_amount?: number
          paid_amount?: number
          pass_amount?: number
          pass_enabled?: boolean
          payment_mode: string
          split_payment?: boolean
          tips_amount?: number
          tips_rate?: number
          total_amount?: number
          updated_at?: string
          upi_amount?: number
          vehicle_capacity?: number
          vehicle_number: string
        }
        Update: {
          cash_amount?: number
          company_id?: string
          company_name?: string
          created_at?: string
          driver_name?: string
          id?: string
          invoice_number?: string | null
          outstanding_amount?: number
          paid_amount?: number
          pass_amount?: number
          pass_enabled?: boolean
          payment_mode?: string
          split_payment?: boolean
          tips_amount?: number
          tips_rate?: number
          total_amount?: number
          updated_at?: string
          upi_amount?: number
          vehicle_capacity?: number
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          contact_number: string
          created_at: string
          driver_name: string
          id: string
          name: string
          notes: string
          updated_at: string
          vehicle_capacity: number
          vehicle_number: string
        }
        Insert: {
          address?: string
          contact_number?: string
          created_at?: string
          driver_name?: string
          id?: string
          name: string
          notes?: string
          updated_at?: string
          vehicle_capacity?: number
          vehicle_number: string
        }
        Update: {
          address?: string
          contact_number?: string
          created_at?: string
          driver_name?: string
          id?: string
          name?: string
          notes?: string
          updated_at?: string
          vehicle_capacity?: number
          vehicle_number?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          linked_bill_id: string | null
          linked_company_id: string | null
          linked_machine_id: string | null
          linked_operator_id: string | null
          notes: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date?: string
          id?: string
          linked_bill_id?: string | null
          linked_company_id?: string | null
          linked_machine_id?: string | null
          linked_operator_id?: string | null
          notes?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          linked_bill_id?: string | null
          linked_company_id?: string | null
          linked_machine_id?: string | null
          linked_operator_id?: string | null
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_linked_bill_id_fkey"
            columns: ["linked_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_linked_company_id_fkey"
            columns: ["linked_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_linked_machine_id_fkey"
            columns: ["linked_machine_id"]
            isOneToOne: false
            referencedRelation: "hitachi_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_linked_operator_id_fkey"
            columns: ["linked_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      hitachi_entries: {
        Row: {
          created_at: string
          date: string
          ending_hours: number
          id: string
          machine_id: string
          machine_name: string
          machine_revenue: number
          notes: string
          operator_id: string | null
          operator_name: string
          operator_salary: number
          shift: string
          starting_hours: number
          total_hours: number
        }
        Insert: {
          created_at?: string
          date?: string
          ending_hours?: number
          id?: string
          machine_id: string
          machine_name: string
          machine_revenue?: number
          notes?: string
          operator_id?: string | null
          operator_name?: string
          operator_salary?: number
          shift?: string
          starting_hours?: number
          total_hours?: number
        }
        Update: {
          created_at?: string
          date?: string
          ending_hours?: number
          id?: string
          machine_id?: string
          machine_name?: string
          machine_revenue?: number
          notes?: string
          operator_id?: string | null
          operator_name?: string
          operator_salary?: number
          shift?: string
          starting_hours?: number
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "hitachi_entries_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "hitachi_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitachi_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      hitachi_fuel: {
        Row: {
          created_at: string
          date: string
          hour_reading: number
          id: string
          liters: number
          machine_id: string
          machine_name: string
        }
        Insert: {
          created_at?: string
          date?: string
          hour_reading?: number
          id?: string
          liters?: number
          machine_id: string
          machine_name: string
        }
        Update: {
          created_at?: string
          date?: string
          hour_reading?: number
          id?: string
          liters?: number
          machine_id?: string
          machine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hitachi_fuel_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "hitachi_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      hitachi_machines: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          created_at: string
          hourly_salary_rate: number
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hourly_salary_rate?: number
          id?: string
          name: string
          phone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hourly_salary_rate?: number
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bill_id: string
          company_id: string
          created_at: string
          date: string
          id: string
          notes: string
        }
        Insert: {
          amount?: number
          bill_id: string
          company_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string
        }
        Update: {
          amount?: number
          bill_id?: string
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          tips_enabled: boolean
          tips_rate: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          tips_enabled?: boolean
          tips_rate?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          tips_enabled?: boolean
          tips_rate?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          company_id: string
          created_at: string
          driver_name: string
          id: string
          updated_at: string
          vehicle_capacity: number
          vehicle_number: string
        }
        Insert: {
          company_id: string
          created_at?: string
          driver_name?: string
          id?: string
          updated_at?: string
          vehicle_capacity?: number
          vehicle_number: string
        }
        Update: {
          company_id?: string
          created_at?: string
          driver_name?: string
          id?: string
          updated_at?: string
          vehicle_capacity?: number
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
