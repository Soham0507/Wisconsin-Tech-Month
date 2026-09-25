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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_clicks: {
        Row: {
          created_at: string
          event_id: string
          id: string
          referrer: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          referrer?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          admin_note: string | null
          audience: string[]
          capacity: number | null
          city: string
          cost_cents: number
          created_at: string
          denial_reason: string | null
          description: string
          ends_at: string | null
          external_url: string | null
          featured: boolean
          featured_home: boolean
          format: Database["public"]["Enums"]["event_format"]
          host_contact_name: string
          host_contact_phone: string
          host_contact_role: string
          host_email: string
          host_logo_url: string | null
          host_org: string
          host_org_type: string
          host_url: string
          id: string
          image_url: string | null
          organizer_id: string
          path: Database["public"]["Enums"]["event_path"]
          published_at: string | null
          region: string | null
          resubmitted_at: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          summary: string | null
          title: string
          topics: string[]
          track: string | null
          updated_at: string
          venue: string | null
          week: string
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          audience?: string[]
          capacity?: number | null
          city: string
          cost_cents?: number
          created_at?: string
          denial_reason?: string | null
          description?: string
          ends_at?: string | null
          external_url?: string | null
          featured?: boolean
          featured_home?: boolean
          format: Database["public"]["Enums"]["event_format"]
          host_contact_name?: string
          host_contact_phone?: string
          host_contact_role?: string
          host_email?: string
          host_logo_url?: string | null
          host_org: string
          host_org_type?: string
          host_url?: string
          id?: string
          image_url?: string | null
          organizer_id: string
          path: Database["public"]["Enums"]["event_path"]
          published_at?: string | null
          region?: string | null
          resubmitted_at?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          title: string
          topics?: string[]
          track?: string | null
          updated_at?: string
          venue?: string | null
          week: string
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          audience?: string[]
          capacity?: number | null
          city?: string
          cost_cents?: number
          created_at?: string
          denial_reason?: string | null
          description?: string
          ends_at?: string | null
          external_url?: string | null
          featured?: boolean
          featured_home?: boolean
          format?: Database["public"]["Enums"]["event_format"]
          host_contact_name?: string
          host_contact_phone?: string
          host_contact_role?: string
          host_email?: string
          host_logo_url?: string | null
          host_org?: string
          host_org_type?: string
          host_url?: string
          id?: string
          image_url?: string | null
          organizer_id?: string
          path?: Database["public"]["Enums"]["event_path"]
          published_at?: string | null
          region?: string | null
          resubmitted_at?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          title?: string
          topics?: string[]
          track?: string | null
          updated_at?: string
          venue?: string | null
          week?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          id: string
          path: string
          referrer: string | null
          session_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      pending_admin_invites: {
        Row: {
          created_at: string
          email: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          host_contact_name: string | null
          host_contact_phone: string | null
          host_contact_role: string | null
          host_email: string | null
          host_logo_url: string | null
          host_org: string | null
          host_org_type: string | null
          host_url: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          host_contact_name?: string | null
          host_contact_phone?: string | null
          host_contact_role?: string | null
          host_email?: string | null
          host_logo_url?: string | null
          host_org?: string | null
          host_org_type?: string | null
          host_url?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          host_contact_name?: string | null
          host_contact_phone?: string | null
          host_contact_role?: string | null
          host_email?: string | null
          host_logo_url?: string | null
          host_org?: string | null
          host_org_type?: string | null
          host_url?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsor_inquiries: {
        Row: {
          budget_range: string | null
          city_focus: string | null
          company: string
          created_at: string
          email: string
          id: string
          interests: string[]
          message: string | null
          name: string
          tier_interest: string | null
        }
        Insert: {
          budget_range?: string | null
          city_focus?: string | null
          company: string
          created_at?: string
          email: string
          id?: string
          interests?: string[]
          message?: string | null
          name: string
          tier_interest?: string | null
        }
        Update: {
          budget_range?: string | null
          city_focus?: string | null
          company?: string
          created_at?: string
          email?: string
          id?: string
          interests?: string[]
          message?: string | null
          name?: string
          tier_interest?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
    }
    Views: {
      events_public: {
        Row: {
          address: string | null
          audience: string[] | null
          capacity: number | null
          city: string | null
          cost_cents: number | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          external_url: string | null
          featured: boolean | null
          featured_home: boolean | null
          format: Database["public"]["Enums"]["event_format"] | null
          host_logo_url: string | null
          host_org: string | null
          host_org_type: string | null
          host_url: string | null
          id: string | null
          image_url: string | null
          organizer_id: string | null
          path: Database["public"]["Enums"]["event_path"] | null
          published_at: string | null
          region: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          summary: string | null
          title: string | null
          topics: string[] | null
          track: string | null
          updated_at: string | null
          venue: string | null
          week: string | null
        }
        Insert: {
          address?: string | null
          audience?: string[] | null
          capacity?: number | null
          city?: string | null
          cost_cents?: number | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          featured?: boolean | null
          featured_home?: boolean | null
          format?: Database["public"]["Enums"]["event_format"] | null
          host_logo_url?: string | null
          host_org?: string | null
          host_org_type?: string | null
          host_url?: string | null
          id?: string | null
          image_url?: string | null
          organizer_id?: string | null
          path?: Database["public"]["Enums"]["event_path"] | null
          published_at?: string | null
          region?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          summary?: string | null
          title?: string | null
          topics?: string[] | null
          track?: string | null
          updated_at?: string | null
          venue?: string | null
          week?: string | null
        }
        Update: {
          address?: string | null
          audience?: string[] | null
          capacity?: number | null
          city?: string | null
          cost_cents?: number | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          featured?: boolean | null
          featured_home?: boolean | null
          format?: Database["public"]["Enums"]["event_format"] | null
          host_logo_url?: string | null
          host_org?: string | null
          host_org_type?: string | null
          host_url?: string | null
          id?: string | null
          image_url?: string | null
          organizer_id?: string | null
          path?: Database["public"]["Enums"]["event_path"] | null
          published_at?: string | null
          region?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          summary?: string | null
          title?: string | null
          topics?: string[] | null
          track?: string | null
          updated_at?: string | null
          venue?: string | null
          week?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "organizer"
      event_format: "in-person" | "virtual" | "hybrid"
      event_path: "external" | "internal"
      event_status: "draft" | "pending" | "approved" | "denied"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "organizer"],
      event_format: ["in-person", "virtual", "hybrid"],
      event_path: ["external", "internal"],
      event_status: ["draft", "pending", "approved", "denied"],
    },
  },
} as const
