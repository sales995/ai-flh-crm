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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          completed_at: string | null
          created_at: string
          created_by: string
          duration: number | null
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_at: string | null
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          completed_at?: string | null
          created_at?: string
          created_by: string
          duration?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_at?: string | null
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          duration?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          id: string
          lead_id: string | null
          reason: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          id?: string
          lead_id?: string | null
          reason?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          id?: string
          lead_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      builders: {
        Row: {
          category: string | null
          contact_number: string | null
          cp_spoc_name: string | null
          created_at: string
          created_by: string | null
          google_map_link: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact_number?: string | null
          cp_spoc_name?: string | null
          created_at?: string
          created_by?: string | null
          google_map_link?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact_number?: string | null
          cp_spoc_name?: string | null
          created_at?: string
          created_by?: string | null
          google_map_link?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          attempt_number: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string | null
          next_followup_at: string | null
          notes: string | null
          outcome: string | null
          scheduled_at: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          next_followup_at?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          next_followup_at?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_details: {
        Row: {
          additional_notes: string | null
          budget_flexibility: string | null
          buying_for: string | null
          created_at: string | null
          current_location: string | null
          decision_maker: string | null
          family_size: number | null
          financing_status: string | null
          id: string
          lead_id: string | null
          preferred_locations: string[] | null
          property_requirements: Json | null
          purchase_intent: string | null
          roi_months: number | null
          specify_buying_for: string | null
          timeline: string | null
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          budget_flexibility?: string | null
          buying_for?: string | null
          created_at?: string | null
          current_location?: string | null
          decision_maker?: string | null
          family_size?: number | null
          financing_status?: string | null
          id?: string
          lead_id?: string | null
          preferred_locations?: string[] | null
          property_requirements?: Json | null
          purchase_intent?: string | null
          roi_months?: number | null
          specify_buying_for?: string | null
          timeline?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          budget_flexibility?: string | null
          buying_for?: string | null
          created_at?: string | null
          current_location?: string | null
          decision_maker?: string | null
          family_size?: number | null
          financing_status?: string | null
          id?: string
          lead_id?: string | null
          preferred_locations?: string[] | null
          property_requirements?: Json | null
          purchase_intent?: string | null
          roi_months?: number | null
          specify_buying_for?: string | null
          timeline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_details_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          attempt_count: number | null
          budget_max: number | null
          budget_min: number | null
          campaign: string | null
          consent: boolean | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          junk_reason: string | null
          last_attempt_at: string | null
          last_contacted_at: string | null
          lead_type: Database["public"]["Enums"]["lead_type"] | null
          location: string | null
          name: string
          next_followup_date: string | null
          notes: string | null
          phone: string
          project_type: Database["public"]["Enums"]["project_type"] | null
          source: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attempt_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          campaign?: string | null
          consent?: boolean | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          junk_reason?: string | null
          last_attempt_at?: string | null
          last_contacted_at?: string | null
          lead_type?: Database["public"]["Enums"]["lead_type"] | null
          location?: string | null
          name: string
          next_followup_date?: string | null
          notes?: string | null
          phone: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attempt_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          campaign?: string | null
          consent?: boolean | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          junk_reason?: string | null
          last_attempt_at?: string | null
          last_contacted_at?: string | null
          lead_type?: Database["public"]["Enums"]["lead_type"] | null
          location?: string | null
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          phone?: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      matchings: {
        Row: {
          approved: boolean | null
          created_at: string
          id: string
          lead_id: string
          match_reasons: string[] | null
          project_id: string
          score: number
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          id?: string
          lead_id: string
          match_reasons?: string[] | null
          project_id: string
          score: number
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          id?: string
          lead_id?: string
          match_reasons?: string[] | null
          project_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matchings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_login_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          availability_date: string | null
          bathrooms: number | null
          bedrooms: number | null
          brochure_link: string | null
          builder_id: string | null
          builder_possession_date: string | null
          construction_stage: string | null
          created_at: string
          created_by: string
          description: string | null
          detailed_pricing_link: string | null
          id: string
          inventory_1_5bhk: number | null
          inventory_1bhk: number | null
          inventory_1rk: number | null
          inventory_2_5bhk: number | null
          inventory_2bhk: number | null
          inventory_2bhk_1t: number | null
          inventory_3bhk: number | null
          inventory_3bhk_2t: number | null
          inventory_4bhk: number | null
          inventory_5bhk: number | null
          is_active: boolean
          launch_date: string | null
          location: string
          name: string
          number_of_floors: number | null
          plot_range: string | null
          price: number
          price_max: number | null
          price_min: number | null
          price_per_sqft: number | null
          price_range: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          rera_possession_date: string | null
          size_sqft: number | null
          starting_price_1_5bhk: number | null
          starting_price_1bhk: number | null
          starting_price_1rk: number | null
          starting_price_2_5bhk: number | null
          starting_price_2bhk: number | null
          starting_price_3bhk: number | null
          starting_price_4bhk: number | null
          starting_price_5bhk: number | null
          starting_size_2bhk: number | null
          starting_size_3bhk: number | null
          starting_size_4bhk: number | null
          starting_size_5bhk: number | null
          structure: string | null
          tags: string[] | null
          total_amenities: number | null
          total_land_area: number | null
          total_towers: number | null
          total_units: number | null
          updated_at: string
          villa_type: string | null
        }
        Insert: {
          availability_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          brochure_link?: string | null
          builder_id?: string | null
          builder_possession_date?: string | null
          construction_stage?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          detailed_pricing_link?: string | null
          id?: string
          inventory_1_5bhk?: number | null
          inventory_1bhk?: number | null
          inventory_1rk?: number | null
          inventory_2_5bhk?: number | null
          inventory_2bhk?: number | null
          inventory_2bhk_1t?: number | null
          inventory_3bhk?: number | null
          inventory_3bhk_2t?: number | null
          inventory_4bhk?: number | null
          inventory_5bhk?: number | null
          is_active?: boolean
          launch_date?: string | null
          location: string
          name: string
          number_of_floors?: number | null
          plot_range?: string | null
          price: number
          price_max?: number | null
          price_min?: number | null
          price_per_sqft?: number | null
          price_range?: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          rera_possession_date?: string | null
          size_sqft?: number | null
          starting_price_1_5bhk?: number | null
          starting_price_1bhk?: number | null
          starting_price_1rk?: number | null
          starting_price_2_5bhk?: number | null
          starting_price_2bhk?: number | null
          starting_price_3bhk?: number | null
          starting_price_4bhk?: number | null
          starting_price_5bhk?: number | null
          starting_size_2bhk?: number | null
          starting_size_3bhk?: number | null
          starting_size_4bhk?: number | null
          starting_size_5bhk?: number | null
          structure?: string | null
          tags?: string[] | null
          total_amenities?: number | null
          total_land_area?: number | null
          total_towers?: number | null
          total_units?: number | null
          updated_at?: string
          villa_type?: string | null
        }
        Update: {
          availability_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          brochure_link?: string | null
          builder_id?: string | null
          builder_possession_date?: string | null
          construction_stage?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          detailed_pricing_link?: string | null
          id?: string
          inventory_1_5bhk?: number | null
          inventory_1bhk?: number | null
          inventory_1rk?: number | null
          inventory_2_5bhk?: number | null
          inventory_2bhk?: number | null
          inventory_2bhk_1t?: number | null
          inventory_3bhk?: number | null
          inventory_3bhk_2t?: number | null
          inventory_4bhk?: number | null
          inventory_5bhk?: number | null
          is_active?: boolean
          launch_date?: string | null
          location?: string
          name?: string
          number_of_floors?: number | null
          plot_range?: string | null
          price?: number
          price_max?: number | null
          price_min?: number | null
          price_per_sqft?: number | null
          price_range?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          rera_possession_date?: string | null
          size_sqft?: number | null
          starting_price_1_5bhk?: number | null
          starting_price_1bhk?: number | null
          starting_price_1rk?: number | null
          starting_price_2_5bhk?: number | null
          starting_price_2bhk?: number | null
          starting_price_3bhk?: number | null
          starting_price_4bhk?: number | null
          starting_price_5bhk?: number | null
          starting_size_2bhk?: number | null
          starting_size_3bhk?: number | null
          starting_size_4bhk?: number | null
          starting_size_5bhk?: number | null
          structure?: string | null
          tags?: string[] | null
          total_amenities?: number | null
          total_land_area?: number | null
          total_towers?: number | null
          total_units?: number | null
          updated_at?: string
          villa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          feedback: string | null
          id: string
          lead_id: string | null
          next_steps: string | null
          outcome: string | null
          pre_sales_id: string | null
          project_id: string | null
          sales_manager_id: string | null
          scheduled_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          feedback?: string | null
          id?: string
          lead_id?: string | null
          next_steps?: string | null
          outcome?: string | null
          pre_sales_id?: string | null
          project_id?: string | null
          sales_manager_id?: string | null
          scheduled_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          feedback?: string | null
          id?: string
          lead_id?: string | null
          next_steps?: string | null
          outcome?: string | null
          pre_sales_id?: string | null
          project_id?: string | null
          sales_manager_id?: string | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_pre_sales_id_fkey"
            columns: ["pre_sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_sales_manager_id_fkey"
            columns: ["sales_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      is_user_active: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _details: Json
          _record_id: string
          _table_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_outcome:
        | "successful"
        | "follow_up"
        | "no_answer"
        | "not_interested"
      activity_type: "call" | "email" | "meeting" | "note"
      app_role:
        | "admin"
        | "business_manager"
        | "supply_manager"
        | "pre_sales_manager"
        | "sales_manager"
        | "agent"
        | "manager"
      lead_status:
        | "new"
        | "contacted"
        | "reached"
        | "qualified"
        | "interested"
        | "site_visit_scheduled"
        | "site_visit_rescheduled"
        | "site_visit_completed"
        | "not_interested"
        | "converted"
        | "lost"
        | "junk"
      lead_type: "fresh" | "duplicate"
      project_type: "apartment" | "villa" | "townhouse" | "commercial" | "land"
      user_status: "active" | "inactive"
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
      activity_outcome: [
        "successful",
        "follow_up",
        "no_answer",
        "not_interested",
      ],
      activity_type: ["call", "email", "meeting", "note"],
      app_role: [
        "admin",
        "business_manager",
        "supply_manager",
        "pre_sales_manager",
        "sales_manager",
        "agent",
        "manager",
      ],
      lead_status: [
        "new",
        "contacted",
        "reached",
        "qualified",
        "interested",
        "site_visit_scheduled",
        "site_visit_rescheduled",
        "site_visit_completed",
        "not_interested",
        "converted",
        "lost",
        "junk",
      ],
      lead_type: ["fresh", "duplicate"],
      project_type: ["apartment", "villa", "townhouse", "commercial", "land"],
      user_status: ["active", "inactive"],
    },
  },
} as const
