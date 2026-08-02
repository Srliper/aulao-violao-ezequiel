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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_chat_history: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_completions: {
        Row: {
          assignment_id: string
          completed_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignee_id: string | null
          class_time: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          repertoire_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          class_time?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          repertoire_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          class_time?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          repertoire_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_repertoire_id_fkey"
            columns: ["repertoire_id"]
            isOneToOne: false
            referencedRelation: "repertoire"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          checked_in_by: string | null
          class_date: string
          class_time: string
          created_at: string
          id: string
          justification: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Insert: {
          checked_in_by?: string | null
          class_date: string
          class_time?: string
          created_at?: string
          id?: string
          justification?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Update: {
          checked_in_by?: string | null
          class_date?: string
          class_time?: string
          created_at?: string
          id?: string
          justification?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string
        }
        Relationships: []
      }
      class_schedule: {
        Row: {
          class_date: string
          class_time: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          updated_at: string
          will_happen: boolean
        }
        Insert: {
          class_date: string
          class_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          will_happen?: boolean
        }
        Update: {
          class_date?: string
          class_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          will_happen?: boolean
        }
        Relationships: []
      }
      contact_clicks: {
        Row: {
          channel: string
          created_at: string
          id: string
          source: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          source?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          source?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          id: string
          image_path: string
          sort_order: number
          title: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          image_path: string
          sort_order?: number
          title?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          image_path?: string
          sort_order?: number
          title?: string | null
        }
        Relationships: []
      }
      mentorship_sessions: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          mentorship_id: string
          modality: string
          session_date: string
          topics_covered: string | null
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          mentorship_id: string
          modality?: string
          session_date: string
          topics_covered?: string | null
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          mentorship_id?: string
          modality?: string
          session_date?: string
          topics_covered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorships: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          mentee_id: string
          mentor_id: string
          start_date: string
          status: Database["public"]["Enums"]["mentorship_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["mentorship_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["mentorship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          class_reminder_minutes: number
          created_at: string
          notify_classes: boolean
          notify_mentions: boolean
          notify_messages: boolean
          notify_practice: boolean
          practice_reminder_days: number[]
          practice_reminder_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          class_reminder_minutes?: number
          created_at?: string
          notify_classes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_practice?: boolean
          practice_reminder_days?: number[]
          practice_reminder_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          class_reminder_minutes?: number
          created_at?: string
          notify_classes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_practice?: boolean
          practice_reminder_days?: number[]
          practice_reminder_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_logs: {
        Row: {
          created_at: string
          id: string
          minutes: number
          notes: string | null
          practice_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes?: number
          notes?: string | null
          practice_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          notes?: string | null
          practice_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_reminder_rules: {
        Row: {
          class_time: string | null
          created_at: string
          created_by: string | null
          discipline: string | null
          enabled: boolean
          id: string
          level: string | null
          reminder_days: number[]
          reminder_hour: number
          scope_type: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_time?: string | null
          created_at?: string
          created_by?: string | null
          discipline?: string | null
          enabled?: boolean
          id?: string
          level?: string | null
          reminder_days?: number[]
          reminder_hour?: number
          scope_type?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          class_time?: string | null
          created_at?: string
          created_by?: string | null
          discipline?: string | null
          enabled?: boolean
          id?: string
          level?: string | null
          reminder_days?: number[]
          reminder_hour?: number
          scope_type?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          class_time: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          rank_id: number | null
          started_at: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          class_time?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          rank_id?: number | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          class_time?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          rank_id?: number | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          auth: string | null
          class_reminder_minutes: number | null
          created_at: string
          device_label: string | null
          enabled: boolean
          endpoint: string
          id: string
          last_seen_at: string
          notify_classes: boolean
          notify_mentions: boolean
          notify_messages: boolean
          notify_practice: boolean
          p256dh: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          class_reminder_minutes?: number | null
          created_at?: string
          device_label?: string | null
          enabled?: boolean
          endpoint: string
          id?: string
          last_seen_at?: string
          notify_classes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_practice?: boolean
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          class_reminder_minutes?: number | null
          created_at?: string
          device_label?: string | null
          enabled?: boolean
          endpoint?: string
          id?: string
          last_seen_at?: string
          notify_classes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_practice?: boolean
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ranks: {
        Row: {
          color: string
          icon: string
          id: number
          min_months: number
          name: string
          requirements: string
          slug: string
          sort_order: number
        }
        Insert: {
          color: string
          icon: string
          id?: number
          min_months?: number
          name: string
          requirements: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string
          icon?: string
          id?: number
          min_months?: number
          name?: string
          requirements?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      repertoire: {
        Row: {
          artist: string | null
          class_time: string | null
          created_at: string
          created_by: string | null
          id: string
          level: string | null
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          artist?: string | null
          class_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          artist?: string | null
          class_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      roster_attendance: {
        Row: {
          class_date: string
          class_time: string
          created_at: string
          created_by: string | null
          id: string
          justification: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_date: string
          class_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          justification?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_date?: string
          class_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          justification?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean
          class_time: string
          created_at: string
          full_name: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          class_time?: string
          created_at?: string
          full_name: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          class_time?: string
          created_at?: string
          full_name?: string
          id?: string
          sort_order?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_practice_reminders: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "mentor" | "student"
      attendance_status: "present" | "absent" | "late"
      mentorship_status: "active" | "completed" | "paused"
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
      app_role: ["admin", "mentor", "student"],
      attendance_status: ["present", "absent", "late"],
      mentorship_status: ["active", "completed", "paused"],
    },
  },
} as const
