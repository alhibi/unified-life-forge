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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      archive_documents: {
        Row: {
          abstract: string
          accession_number: number
          complexity: string
          content: string
          created_at: string
          depth: string
          id: string
          outline: Json
          search_vector: unknown
          tags: string[]
          title: string
          topic: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          abstract?: string
          accession_number?: number
          complexity: string
          content: string
          created_at?: string
          depth: string
          id?: string
          outline?: Json
          search_vector?: unknown
          tags?: string[]
          title: string
          topic: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          abstract?: string
          accession_number?: number
          complexity?: string
          content?: string
          created_at?: string
          depth?: string
          id?: string
          outline?: Json
          search_vector?: unknown
          tags?: string[]
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      clipboard_items: {
        Row: {
          clipboard_type: string
          created_at: string
          description: string | null
          id: string
          item_from: string | null
          item_id: string
          saved_at: string
          source: string | null
          title: string
          user_id: string
        }
        Insert: {
          clipboard_type?: string
          created_at?: string
          description?: string | null
          id?: string
          item_from?: string | null
          item_id: string
          saved_at?: string
          source?: string | null
          title: string
          user_id: string
        }
        Update: {
          clipboard_type?: string
          created_at?: string
          description?: string | null
          id?: string
          item_from?: string | null
          item_id?: string
          saved_at?: string
          source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          pinned_message_id: string | null
          self_destruct_seconds: number | null
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pinned_message_id?: string | null
          self_destruct_seconds?: number | null
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pinned_message_id?: string | null
          self_destruct_seconds?: number | null
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          mood: Database["public"]["Enums"]["journal_mood"]
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          mood?: Database["public"]["Enums"]["journal_mood"]
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mood?: Database["public"]["Enums"]["journal_mood"]
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      keyword_alert_hits: {
        Row: {
          alert_id: string
          article_link: string
          article_title: string
          id: string
          matched_at: string
          seen: boolean
          source_name: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          article_link: string
          article_title: string
          id?: string
          matched_at?: string
          seen?: boolean
          source_name?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          article_link?: string
          article_title?: string
          id?: string
          matched_at?: string
          seen?: boolean
          source_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_alert_hits_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "keyword_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_alerts: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          keyword: string
          last_check_at: string
          match_mode: string
          source_filter: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          keyword: string
          last_check_at?: string
          match_mode?: string
          source_filter?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          keyword?: string
          last_check_at?: string
          match_mode?: string
          source_filter?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_id: string | null
          content: string
          conversation_id: string
          created_at: string
          deleted: boolean
          delivered_at: string | null
          edited_at: string | null
          expires_at: string | null
          file_name: string | null
          file_url: string | null
          forwarded_from_message_id: string | null
          forwarded_from_sender_id: string | null
          hidden_for: string[]
          id: string
          message_type: string
          read: boolean
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          deleted?: boolean
          delivered_at?: string | null
          edited_at?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_url?: string | null
          forwarded_from_message_id?: string | null
          forwarded_from_sender_id?: string | null
          hidden_for?: string[]
          id?: string
          message_type?: string
          read?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted?: boolean
          delivered_at?: string | null
          edited_at?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_url?: string | null
          forwarded_from_message_id?: string | null
          forwarded_from_sender_id?: string | null
          hidden_for?: string[]
          id?: string
          message_type?: string
          read?: boolean
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_message_id_fkey"
            columns: ["forwarded_from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      pkm_ai_generations: {
        Row: {
          created_at: string
          generated_content: string | null
          id: string
          mode: string
          model: string
          note_id: string
          original_content: string
          status: string
        }
        Insert: {
          created_at?: string
          generated_content?: string | null
          id?: string
          mode: string
          model?: string
          note_id: string
          original_content: string
          status?: string
        }
        Update: {
          created_at?: string
          generated_content?: string | null
          id?: string
          mode?: string
          model?: string
          note_id?: string
          original_content?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pkm_ai_generations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "pkm_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      pkm_mind_events: {
        Row: {
          created_at: string
          id: string
          related_note_ids: string[]
          summary: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          related_note_ids: string[]
          summary: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          related_note_ids?: string[]
          summary?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pkm_note_links: {
        Row: {
          created_at: string
          id: string
          link_text: string
          source_note_id: string
          target_note_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_text: string
          source_note_id: string
          target_note_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_text?: string
          source_note_id?: string
          target_note_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pkm_note_links_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "pkm_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pkm_note_links_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "pkm_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      pkm_notes: {
        Row: {
          content_md: string
          created_at: string
          id: string
          is_deleted: boolean
          status: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          content_md?: string
          created_at?: string
          id: string
          is_deleted?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      reading_bookmarks: {
        Row: {
          article_link: string
          created_at: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          article_link: string
          created_at?: string
          snapshot: Json
          user_id: string
        }
        Update: {
          article_link?: string
          created_at?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      reading_feeds: {
        Row: {
          category: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          sort_order: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_prefs: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_read_state: {
        Row: {
          article_link: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_link: string
          read_at?: string
          user_id: string
        }
        Update: {
          article_link?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rss_articles: {
        Row: {
          created_at: string
          description: string | null
          fetched_at: string
          full_content: string | null
          id: string
          image: string | null
          images: Json | null
          link: string
          pub_date: string | null
          search_vector: unknown
          source_name: string
          source_url: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fetched_at?: string
          full_content?: string | null
          id?: string
          image?: string | null
          images?: Json | null
          link: string
          pub_date?: string | null
          search_vector?: unknown
          source_name: string
          source_url: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fetched_at?: string
          full_content?: string | null
          id?: string
          image?: string | null
          images?: Json | null
          link?: string
          pub_date?: string | null
          search_vector?: unknown
          source_name?: string
          source_url?: string
          title?: string
        }
        Relationships: []
      }
      rss_feed_meta: {
        Row: {
          consecutive_failures: number
          created_at: string
          etag: string | null
          item_count_last: number | null
          last_error: string | null
          last_fetched_at: string | null
          last_modified: string | null
          last_status: number | null
          source_url: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          etag?: string | null
          item_count_last?: number | null
          last_error?: string | null
          last_fetched_at?: string | null
          last_modified?: string | null
          last_status?: number | null
          source_url: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          etag?: string | null
          item_count_last?: number | null
          last_error?: string | null
          last_fetched_at?: string | null
          last_modified?: string | null
          last_status?: number | null
          source_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_records: {
        Row: {
          created_at: string
          data: Json
          kind: string
          record_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          kind: string
          record_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          kind?: string
          record_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_last_seen: { Args: { target_user_id: string }; Returns: string }
      invoke_edge_function: {
        Args: { fn_name: string; payload?: Json }
        Returns: number
      }
      mark_message_read: { Args: { p_message_id: string }; Returns: undefined }
      mark_messages_delivered: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_messages_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      normalize_arabic: { Args: { s: string }; Returns: string }
      reading_cron_status: {
        Args: { max_rows?: number }
        Returns: {
          end_time: string
          jobname: string
          return_message: string
          start_time: string
          status: string
        }[]
      }
      search_archive: {
        Args: { max_rows?: number; q: string }
        Returns: {
          abstract: string
          accession_number: number
          created_at: string
          depth: string
          id: string
          rank: number
          tags: string[]
          title: string
          word_count: number
        }[]
      }
      search_rss_articles: {
        Args: {
          max_rows?: number
          q: string
          since_at?: string
          src_names?: string[]
        }
        Returns: {
          description: string
          image: string
          link: string
          pub_date: string
          rank: number
          source_name: string
          title: string
        }[]
      }
      update_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      journal_mood: "organic" | "analytical" | "balanced"
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
      journal_mood: ["organic", "analytical", "balanced"],
    },
  },
} as const
