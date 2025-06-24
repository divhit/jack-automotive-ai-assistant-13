export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      call_recordings: {
        Row: {
          analysis: Json | null
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          expires_at: string | null
          file_size_bytes: number | null
          id: string
          signed_url: string | null
          storage_path: string
          transcription: string | null
          twilio_call_sid: string
          twilio_recording_sid: string
        }
        Insert: {
          analysis?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          signed_url?: string | null
          storage_path: string
          transcription?: string | null
          twilio_call_sid: string
          twilio_recording_sid: string
        }
        Update: {
          analysis?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          signed_url?: string | null
          storage_path?: string
          transcription?: string | null
          twilio_call_sid?: string
          twilio_recording_sid?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_status: {
        Row: {
          conversation_id: string | null
          direction: string | null
          duration_seconds: number | null
          error_code: string | null
          error_message: string | null
          id: string
          price: number | null
          status: string
          twilio_call_sid: string
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          direction?: string | null
          duration_seconds?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          price?: number | null
          status: string
          twilio_call_sid: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          direction?: string | null
          duration_seconds?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          price?: number | null
          status?: string
          twilio_call_sid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          duration_seconds: number | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          started_at: string | null
          status: string | null
          twilio_call_sid: string | null
          type: string
        }
        Insert: {
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          twilio_call_sid?: string | null
          type: string
        }
        Update: {
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          twilio_call_sid?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string | null
          phone_number: string
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          phone_number: string
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          phone_number?: string
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          speaker: string
          timestamp: string | null
          twilio_message_sid: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          speaker: string
          timestamp?: string | null
          twilio_message_sid?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          speaker?: string
          timestamp?: string | null
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_status: {
        Row: {
          error_code: string | null
          error_message: string | null
          id: string
          message_id: string | null
          status: string
          twilio_message_sid: string
          updated_at: string | null
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          status: string
          twilio_message_sid: string
          updated_at?: string | null
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          status?: string
          twilio_message_sid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_successfully: boolean | null
          signature_verified: boolean | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_successfully?: boolean | null
          signature_verified?: boolean | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_successfully?: boolean | null
          signature_verified?: boolean | null
          webhook_type?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
