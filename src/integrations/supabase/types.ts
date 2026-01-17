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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_id: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          is_completed: boolean | null
          owner_id: string | null
          priority: number | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          activity_id?: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          is_completed?: boolean | null
          owner_id?: string | null
          priority?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          is_completed?: boolean | null
          owner_id?: string | null
          priority?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string | null
          ip_address: unknown
          log_id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string | null
          ip_address?: unknown
          log_id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string | null
          ip_address?: unknown
          log_id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          contact_id: string
          created_at: string | null
          email: string | null
          first_name: string
          job_title: string | null
          last_name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          company?: string | null
          contact_id?: string
          created_at?: string | null
          email?: string | null
          first_name: string
          job_title?: string | null
          last_name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          company?: string | null
          contact_id?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          job_title?: string | null
          last_name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          deal_id: string
          expected_close_date: string | null
          notes: string | null
          owner_id: string | null
          probability: number | null
          stage: Database["public"]["Enums"]["deal_stage"]
          tenant_id: string
          title: string
          updated_at: string | null
          value: number | null
          version: number | null
        }
        Insert: {
          actual_close_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string
          expected_close_date?: string | null
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tenant_id: string
          title: string
          updated_at?: string | null
          value?: number | null
          version?: number | null
        }
        Update: {
          actual_close_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string
          expected_close_date?: string | null
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tenant_id?: string
          title?: string
          updated_at?: string | null
          value?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          name: string
          settings: Json | null
          subdomain: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          settings?: Json | null
          subdomain?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          settings?: Json | null
          subdomain?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_tenant: {
        Args: {
          p_role?: Database["public"]["Enums"]["app_role"]
          p_tenant_id: string
          p_user_email: string
          p_user_id: string
          p_user_name?: string
        }
        Returns: boolean
      }
      calculate_tenant_revenue: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      create_tenant_with_admin: {
        Args: {
          p_tenant_name: string
          p_user_email: string
          p_user_id: string
          p_user_name?: string
        }
        Returns: string
      }
      get_deal_success_rate: { Args: { p_tenant_id: string }; Returns: number }
      get_user_tenant_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      validate_email: { Args: { email: string }; Returns: boolean }
      validate_phone: { Args: { phone: string }; Returns: boolean }
    }
    Enums: {
      activity_type: "task" | "call" | "meeting" | "email" | "note"
      app_role: "admin" | "manager" | "sales_agent"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      deal_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "closed_won"
        | "closed_lost"
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
      activity_type: ["task", "call", "meeting", "email", "note"],
      app_role: ["admin", "manager", "sales_agent"],
      audit_action: ["INSERT", "UPDATE", "DELETE"],
      deal_stage: [
        "lead",
        "qualified",
        "proposal",
        "closed_won",
        "closed_lost",
      ],
    },
  },
} as const
