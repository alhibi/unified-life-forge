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
          chat_id: string | null
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
          hidden_for: string[] | null
          id: string
          message_type: string
          read: boolean
          reply_to_id: string | null
          search_vector: unknown | null
          sender_id: string
        }
        Insert: {
          chat_id?: string | null
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
          hidden_for?: string[] | null
          id?: string
          message_type?: string
          read?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string | null
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
          hidden_for?: string[] | null
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
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
      chats: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_revoked: boolean
          invite_token: string | null
          invite_token_created_at: string | null
          is_public: boolean
          kind: string
          legacy_conversation_id: string | null
          pinned_message_id: string | null
          self_destruct_seconds: number | null
          title: string | null
          updated_at: string
          who_can_add_members: string
          who_can_edit_meta: string
          who_can_send: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_revoked?: boolean
          invite_token?: string | null
          invite_token_created_at?: string | null
          is_public?: boolean
          kind: string
          legacy_conversation_id?: string | null
          pinned_message_id?: string | null
          self_destruct_seconds?: number | null
          title?: string | null
          updated_at?: string
          who_can_add_members?: string
          who_can_edit_meta?: string
          who_can_send?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_revoked?: boolean
          invite_token?: string | null
          invite_token_created_at?: string | null
          is_public?: boolean
          kind?: string
          legacy_conversation_id?: string | null
          pinned_message_id?: string | null
          self_destruct_seconds?: number | null
          title?: string | null
          updated_at?: string
          who_can_add_members?: string
          who_can_edit_meta?: string
          who_can_send?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_legacy_conversation_id_fkey"
            columns: ["legacy_conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          added_by: string | null
          archived_at: string | null
          chat_id: string
          custom_title: string | null
          draft_text: string | null
          draft_updated_at: string | null
          id: string
          joined_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          muted_until: string | null
          notifications_enabled: boolean
          pinned_at: string | null
          removed_at: string | null
          removed_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          archived_at?: string | null
          chat_id: string
          custom_title?: string | null
          draft_text?: string | null
          draft_updated_at?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          muted_until?: string | null
          notifications_enabled?: boolean
          pinned_at?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          archived_at?: string | null
          chat_id?: string
          custom_title?: string | null
          draft_text?: string | null
          draft_updated_at?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          muted_until?: string | null
          notifications_enabled?: boolean
          pinned_at?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          blurhash: string | null
          caption: string | null
          chat_id: string
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          kind: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          thumb_path: string | null
          uploaded_by: string
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          caption?: string | null
          chat_id: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          thumb_path?: string | null
          uploaded_by: string
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          caption?: string | null
          chat_id?: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          thumb_path?: string | null
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chat_member: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: Database["public"]["Tables"]["chat_members"]["Row"]
      }
      block_user: {
        Args: { p_user_id: string; p_reason?: string | null }
        Returns: undefined
      }
      chat_member_role: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: string | null
      }
      chat_schema_version: {
        Args: never
        Returns: Json
      }
      create_group_chat: {
        Args: {
          p_kind: string
          p_title: string
          p_description?: string | null
          p_avatar_url?: string | null
          p_member_ids?: string[]
        }
        Returns: Database["public"]["Tables"]["chats"]["Row"]
      }
      create_or_get_dm: {
        Args: { p_other_user_id: string }
        Returns: Database["public"]["Tables"]["chats"]["Row"]
      }
      delete_message_for_me: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      get_messages_paginated: {
        Args: {
          p_chat_id: string
          p_before_id?: string | null
          p_limit?: number
        }
        Returns: Database["public"]["Tables"]["messages"]["Row"][]
      }
      get_visible_profile: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          last_seen: string | null
        }[]
      }
      hide_message_for_self: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      invoke_edge_function: {
        Args: { fn_name: string; payload?: Json }
        Returns: number
      }
      is_chat_member: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      list_chat_members: {
        Args: { p_chat_id: string }
        Returns: {
          user_id: string
          role: string
          custom_title: string | null
          joined_at: string
          added_by: string | null
          username: string | null
          display_name: string | null
          avatar_url: string | null
          last_seen: string | null
        }[]
      }
      list_my_chats: {
        Args: never
        Returns: {
          chat_id: string
          kind: string
          title: string | null
          description: string | null
          avatar_url: string | null
          is_public: boolean
          who_can_send: string
          legacy_conversation_id: string | null
          pinned_message_id: string | null
          self_destruct_seconds: number | null
          updated_at: string
          created_at: string
          member_role: string
          member_pinned_at: string | null
          member_archived_at: string | null
          member_muted_until: string | null
          member_last_read_at: string | null
          member_draft_text: string | null
          unread_count: number
          member_count: number
          last_message_id: string | null
          last_message_at: string | null
          last_message_kind: string | null
          last_message_sender: string | null
          last_message_preview: string | null
          last_message_deleted: boolean
          other_user_id: string | null
          other_username: string | null
          other_display_name: string | null
          other_avatar_url: string | null
          other_last_seen: string | null
        }[]
      }
      mark_chat_read: {
        Args: { p_chat_id: string; p_message_id?: string | null }
        Returns: undefined
      }
      mark_message_delivered: {
        Args: { p_message_id: string }
        Returns: undefined
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
      remove_chat_member: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: undefined
      }
      search_chat_messages: {
        Args: {
          p_query: string
          p_chat_id?: string | null
          p_limit?: number
        }
        Returns: {
          message_id: string
          chat_id: string | null
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          created_at: string
          snippet: string
          rank: number
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
      set_chat_archived: {
        Args: { p_chat_id: string; p_archived: boolean }
        Returns: undefined
      }
      set_chat_draft: {
        Args: { p_chat_id: string; p_text: string }
        Returns: undefined
      }
      set_chat_muted: {
        Args: { p_chat_id: string; p_seconds: number }
        Returns: undefined
      }
      set_chat_pinned: {
        Args: { p_chat_id: string; p_pinned: boolean }
        Returns: undefined
      }
      unblock_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_chat_member_role: {
        Args: {
          p_chat_id: string
          p_user_id: string
          p_new_role: string
        }
        Returns: undefined
      }
      update_chat_metadata: {
        Args: {
          p_chat_id: string
          p_title?: string | null
          p_description?: string | null
          p_avatar_url?: string | null
        }
        Returns: Database["public"]["Tables"]["chats"]["Row"]
      }
      update_last_seen: { Args: never; Returns: undefined }
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
