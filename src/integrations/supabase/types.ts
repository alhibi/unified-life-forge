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
      cefr_levels: {
        Row: {
          code: string
          id: string
          name_ar: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          name_ar: string
          sort_order: number
        }
        Update: {
          code?: string
          id?: string
          name_ar?: string
          sort_order?: number
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
      content_generation_jobs: {
        Row: {
          created_at: string
          id: string
          model_used: string | null
          status: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_used?: string | null
          status?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_used?: string | null
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
      countries: {
        Row: {
          bounds: Json
          continent: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          iso_code: string
          name_ar: string
          name_en: string
          places_count: number
          updated_at: string
        }
        Insert: {
          bounds: Json
          continent?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          iso_code: string
          name_ar: string
          name_en: string
          places_count?: number
          updated_at?: string
        }
        Update: {
          bounds?: Json
          continent?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          iso_code?: string
          name_ar?: string
          name_en?: string
          places_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      country_stamps: {
        Row: {
          created_at: string | null
          first_year: number | null
          id: string
          iso_code: string
          note_ar: string | null
          status: string
          updated_at: string | null
          user_id: string
          visit_count: number
        }
        Insert: {
          created_at?: string | null
          first_year?: number | null
          id?: string
          iso_code: string
          note_ar?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          visit_count?: number
        }
        Update: {
          created_at?: string | null
          first_year?: number | null
          id?: string
          iso_code?: string
          note_ar?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      exercise_vocab_map: {
        Row: {
          exercise_id: string
          vocab_id: string
        }
        Insert: {
          exercise_id: string
          vocab_id: string
        }
        Update: {
          exercise_id?: string
          vocab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_vocab_map_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_vocab_map_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          difficulty: number
          id: string
          lesson_id: string
          payload: Json
          status: string
          type: string
        }
        Insert: {
          difficulty?: number
          id?: string
          lesson_id: string
          payload: Json
          status?: string
          type: string
        }
        Update: {
          difficulty?: number
          id?: string
          lesson_id?: string
          payload?: Json
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_activities: {
        Row: {
          activity_type: string
          avg_heart_rate: number | null
          calories: number | null
          created_at: string | null
          distance_meters: number | null
          duration_seconds: number | null
          end_time: string | null
          external_id: string | null
          id: string
          route: Json | null
          source: string
          start_time: string
          user_id: string
        }
        Insert: {
          activity_type: string
          avg_heart_rate?: number | null
          calories?: number | null
          created_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          end_time?: string | null
          external_id?: string | null
          id?: string
          route?: Json | null
          source: string
          start_time: string
          user_id: string
        }
        Update: {
          activity_type?: string
          avg_heart_rate?: number | null
          calories?: number | null
          created_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          end_time?: string | null
          external_id?: string | null
          id?: string
          route?: Json | null
          source?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_daily_metrics: {
        Row: {
          avg_heart_rate: number | null
          calories: number | null
          date: string
          distance_meters: number | null
          id: string
          sleep_minutes: number | null
          source: string | null
          steps: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          calories?: number | null
          date: string
          distance_meters?: number | null
          id?: string
          sleep_minutes?: number | null
          source?: string | null
          steps?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          calories?: number | null
          date?: string
          distance_meters?: number | null
          id?: string
          sleep_minutes?: number | null
          source?: string | null
          steps?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grammar_points: {
        Row: {
          contrastive_note_ar: string | null
          explanation_ar: string
          id: string
          lesson_id: string
          name: string
        }
        Insert: {
          contrastive_note_ar?: string | null
          explanation_ar: string
          id?: string
          lesson_id: string
          name: string
        }
        Update: {
          contrastive_note_ar?: string | null
          explanation_ar?: string
          id?: string
          lesson_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_points_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
      languages: {
        Row: {
          code: string
          direction: string
          id: string
          name_ar: string
        }
        Insert: {
          code: string
          direction?: string
          id?: string
          name_ar: string
        }
        Update: {
          code?: string
          direction?: string
          id?: string
          name_ar?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          estimated_minutes: number
          id: string
          sort_order: number
          title_ar: string
          title_de: string
          type: string
          unit_id: string
        }
        Insert: {
          estimated_minutes?: number
          id?: string
          sort_order: number
          title_ar: string
          title_de?: string
          type: string
          unit_id: string
        }
        Update: {
          estimated_minutes?: number
          id?: string
          sort_order?: number
          title_ar?: string
          title_de?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
      place_links: {
        Row: {
          created_at: string | null
          id: string
          kind: string
          label: string | null
          place_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind?: string
          label?: string | null
          place_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string
          label?: string | null
          place_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_links_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_photos: {
        Row: {
          caption_ar: string | null
          created_at: string
          id: string
          is_cover: boolean
          place_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption_ar?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          place_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption_ar?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          place_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_photos_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_test_results: {
        Row: {
          id: string
          placed_level_id: string | null
          raw_score: number | null
          taken_at: string
          user_id: string
        }
        Insert: {
          id?: string
          placed_level_id?: string | null
          raw_score?: number | null
          taken_at?: string
          user_id: string
        }
        Update: {
          id?: string
          placed_level_id?: string | null
          raw_score?: number | null
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_test_results_placed_level_id_fkey"
            columns: ["placed_level_id"]
            isOneToOne: false
            referencedRelation: "cefr_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          best_months: number[]
          best_time_to_visit: string | null
          category: string
          city: string | null
          country_id: string
          cover_photo_url: string | null
          created_at: string
          description_ar: string | null
          duration_minutes: number | null
          id: string
          is_favorite: boolean
          location: Json
          name_ar: string
          name_en: string | null
          price_level: number | null
          rating: number | null
          tags: string[]
          tips_ar: string | null
          updated_at: string
          user_id: string
          visit_status: string
          visited_on: string | null
        }
        Insert: {
          address?: string | null
          best_months?: number[]
          best_time_to_visit?: string | null
          category?: string
          city?: string | null
          country_id: string
          cover_photo_url?: string | null
          created_at?: string
          description_ar?: string | null
          duration_minutes?: number | null
          id?: string
          is_favorite?: boolean
          location: Json
          name_ar: string
          name_en?: string | null
          price_level?: number | null
          rating?: number | null
          tags?: string[]
          tips_ar?: string | null
          updated_at?: string
          user_id: string
          visit_status?: string
          visited_on?: string | null
        }
        Update: {
          address?: string | null
          best_months?: number[]
          best_time_to_visit?: string | null
          category?: string
          city?: string | null
          country_id?: string
          cover_photo_url?: string | null
          created_at?: string
          description_ar?: string | null
          duration_minutes?: number | null
          id?: string
          is_favorite?: boolean
          location?: Json
          name_ar?: string
          name_en?: string | null
          price_level?: number | null
          rating?: number | null
          tags?: string[]
          tips_ar?: string | null
          updated_at?: string
          user_id?: string
          visit_status?: string
          visited_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
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
      srs_review_log: {
        Row: {
          elapsed_days: number | null
          id: string
          item_id: string
          rating: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          elapsed_days?: number | null
          id?: string
          item_id: string
          rating: string
          reviewed_at?: string
          user_id: string
        }
        Update: {
          elapsed_days?: number | null
          id?: string
          item_id?: string
          rating?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      srs_state: {
        Row: {
          difficulty: number
          due_at: string
          item_id: string
          item_type: string
          lapses: number
          review_count: number
          stability: number
          user_id: string
        }
        Insert: {
          difficulty?: number
          due_at?: string
          item_id: string
          item_type: string
          lapses?: number
          review_count?: number
          stability?: number
          user_id: string
        }
        Update: {
          difficulty?: number
          due_at?: string
          item_id?: string
          item_type?: string
          lapses?: number
          review_count?: number
          stability?: number
          user_id?: string
        }
        Relationships: []
      }
      trip_checklist: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_done: boolean
          label: string
          sort_order: number
          trip_id: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          is_done?: boolean
          label: string
          sort_order?: number
          trip_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_done?: boolean
          label?: string
          sort_order?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_checklist_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_places: {
        Row: {
          created_at: string | null
          day_index: number
          duration_minutes: number | null
          id: string
          note_ar: string | null
          place_id: string
          sort_order: number
          start_time: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          day_index?: number
          duration_minutes?: number | null
          id?: string
          note_ar?: string | null
          place_id: string
          sort_order?: number
          start_time?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string | null
          day_index?: number
          duration_minutes?: number | null
          id?: string
          note_ar?: string | null
          place_id?: string
          sort_order?: number
          start_time?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_places_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_amount: number | null
          budget_currency: string | null
          country_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          notes_ar: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_amount?: number | null
          budget_currency?: string | null
          country_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes_ar?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          budget_amount?: number | null
          budget_currency?: string | null
          country_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes_ar?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          icon: string | null
          id: string
          level_id: string
          sort_order: number
          theme: string | null
          title_ar: string
          title_de: string
        }
        Insert: {
          icon?: string | null
          id?: string
          level_id: string
          sort_order: number
          theme?: string | null
          title_ar: string
          title_de: string
        }
        Update: {
          icon?: string | null
          id?: string
          level_id?: string
          sort_order?: number
          theme?: string | null
          title_ar?: string
          title_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "cefr_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          last_practiced_at: string | null
          lesson_id: string
          mastery_score: number
          status: string
          user_id: string
        }
        Insert: {
          last_practiced_at?: string | null
          lesson_id: string
          mastery_score?: number
          status?: string
          user_id: string
        }
        Update: {
          last_practiced_at?: string | null
          lesson_id?: string
          mastery_score?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
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
      user_stats: {
        Row: {
          last_active_date: string | null
          league_tier: string
          streak_days: number
          user_id: string
          xp: number
        }
        Insert: {
          last_active_date?: string | null
          league_tier?: string
          streak_days?: number
          user_id: string
          xp?: number
        }
        Update: {
          last_active_date?: string | null
          league_tier?: string
          streak_days?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      vocabulary_items: {
        Row: {
          audio_url: string | null
          example_sentence_ar: string | null
          example_sentence_de: string | null
          frequency_rank: number | null
          gender: string | null
          id: string
          image_url: string | null
          ipa: string | null
          lemma_de: string
          level_id: string
          plural_form: string | null
          status: string
          translation_ar: string
        }
        Insert: {
          audio_url?: string | null
          example_sentence_ar?: string | null
          example_sentence_de?: string | null
          frequency_rank?: number | null
          gender?: string | null
          id?: string
          image_url?: string | null
          ipa?: string | null
          lemma_de: string
          level_id: string
          plural_form?: string | null
          status?: string
          translation_ar: string
        }
        Update: {
          audio_url?: string | null
          example_sentence_ar?: string | null
          example_sentence_de?: string | null
          frequency_rank?: number | null
          gender?: string | null
          id?: string
          image_url?: string | null
          ipa?: string | null
          lemma_de?: string
          level_id?: string
          plural_form?: string | null
          status?: string
          translation_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_items_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "cefr_levels"
            referencedColumns: ["id"]
          },
        ]
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
      search_profiles: {
        Args: { lim?: number; q: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
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
