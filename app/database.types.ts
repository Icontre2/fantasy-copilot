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
      clubs: {
        Row: {
          created_at: string
          external_ids: Json
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          external_ids?: Json
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          external_ids?: Json
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      data_providers: {
        Row: {
          code: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fantasy_teams: {
        Row: {
          balance: number
          created_at: string
          external_league_id: string | null
          id: string
          name: string
          source: string
          squad_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          external_league_id?: string | null
          id?: string
          name?: string
          source?: string
          squad_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          external_league_id?: string | null
          id?: string
          name?: string
          source?: string
          squad_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away_club_id: string | null
          away_score: number | null
          competition_code: string
          created_at: string
          external_id: string
          home_club_id: string | null
          home_score: number | null
          id: string
          kickoff_at: string | null
          provider_code: string
          raw_data: Json
          round: string | null
          season: number
          status: string
          updated_at: string
        }
        Insert: {
          away_club_id?: string | null
          away_score?: number | null
          competition_code?: string
          created_at?: string
          external_id: string
          home_club_id?: string | null
          home_score?: number | null
          id?: string
          kickoff_at?: string | null
          provider_code: string
          raw_data?: Json
          round?: string | null
          season: number
          status?: string
          updated_at?: string
        }
        Update: {
          away_club_id?: string | null
          away_score?: number | null
          competition_code?: string
          created_at?: string
          external_id?: string
          home_club_id?: string | null
          home_score?: number | null
          id?: string
          kickoff_at?: string | null
          provider_code?: string
          raw_data?: Json
          round?: string | null
          season?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_club_id_fkey"
            columns: ["away_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_club_id_fkey"
            columns: ["home_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          fantasy_team_id: string | null
          id: string
          import_type: string
          method: string
          rows_matched: number
          rows_total: number
          rows_unmatched: number
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          fantasy_team_id?: string | null
          id?: string
          import_type: string
          method: string
          rows_matched?: number
          rows_total?: number
          rows_unmatched?: number
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          fantasy_team_id?: string | null
          id?: string
          import_type?: string
          method?: string
          rows_matched?: number
          rows_total?: number
          rows_unmatched?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      import_items: {
        Row: {
          created_at: string
          id: string
          import_batch_id: string
          match_confidence: number | null
          matched_player_id: string | null
          notes: string | null
          raw_club: string | null
          raw_name: string
          raw_position: string | null
          raw_value: number | null
          review_status: string
          row_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          import_batch_id: string
          match_confidence?: number | null
          matched_player_id?: string | null
          notes?: string | null
          raw_club?: string | null
          raw_name: string
          raw_position?: string | null
          raw_value?: number | null
          review_status?: string
          row_number: number
        }
        Update: {
          created_at?: string
          id?: string
          import_batch_id?: string
          match_confidence?: number | null
          matched_player_id?: string | null
          notes?: string | null
          raw_club?: string | null
          raw_name?: string
          raw_position?: string | null
          raw_value?: number | null
          review_status?: string
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_items_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_items_matched_player_id_fkey"
            columns: ["matched_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      market_entries: {
        Row: {
          asking_price: number | null
          captured_at: string
          expires_at: string | null
          fantasy_team_id: string
          id: string
          market_value: number | null
          player_id: string
          seller_name: string | null
          source: string
        }
        Insert: {
          asking_price?: number | null
          captured_at?: string
          expires_at?: string | null
          fantasy_team_id: string
          id?: string
          market_value?: number | null
          player_id: string
          seller_name?: string | null
          source?: string
        }
        Update: {
          asking_price?: number | null
          captured_at?: string
          expires_at?: string | null
          fantasy_team_id?: string
          id?: string
          market_value?: number | null
          player_id?: string
          seller_name?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_entries_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          created_at: string
          current_step: number
          selected_import_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_step?: number
          selected_import_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_step?: number
          selected_import_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_availability: {
        Row: {
          created_at: string
          expected_return_at: string | null
          id: string
          player_id: string
          provider_code: string
          raw_data: Json
          reason: string | null
          source_updated_at: string | null
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_return_at?: string | null
          id?: string
          player_id: string
          provider_code: string
          raw_data?: Json
          reason?: string | null
          source_updated_at?: string | null
          starts_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_return_at?: string | null
          id?: string
          player_id?: string
          provider_code?: string
          raw_data?: Json
          reason?: string | null
          source_updated_at?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_availability_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_availability_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      player_fixture_stats: {
        Row: {
          assists: number | null
          created_at: string
          fantasy_points: number | null
          fixture_id: string
          goals: number | null
          id: string
          minutes: number | null
          player_id: string
          provider_code: string
          rating: number | null
          raw_data: Json
          red_cards: number | null
          started: boolean | null
          updated_at: string
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          created_at?: string
          fantasy_points?: number | null
          fixture_id: string
          goals?: number | null
          id?: string
          minutes?: number | null
          player_id: string
          provider_code: string
          rating?: number | null
          raw_data?: Json
          red_cards?: number | null
          started?: boolean | null
          updated_at?: string
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          created_at?: string
          fantasy_points?: number | null
          fixture_id?: string
          goals?: number | null
          id?: string
          minutes?: number | null
          player_id?: string
          provider_code?: string
          rating?: number | null
          raw_data?: Json
          red_cards?: number | null
          started?: boolean | null
          updated_at?: string
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_fixture_stats_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_fixture_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_fixture_stats_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      player_metrics: {
        Row: {
          created_at: string
          id: string
          market_value: number | null
          metric_date: string
          minutes_recent: number | null
          next_opponent: string | null
          opponent_difficulty: number | null
          player_id: string
          points_recent: number | null
          raw_data: Json
          source: string
          start_probability: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          market_value?: number | null
          metric_date: string
          minutes_recent?: number | null
          next_opponent?: string | null
          opponent_difficulty?: number | null
          player_id: string
          points_recent?: number | null
          raw_data?: Json
          source: string
          start_probability?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          market_value?: number | null
          metric_date?: string
          minutes_recent?: number | null
          next_opponent?: string | null
          opponent_difficulty?: number | null
          player_id?: string
          points_recent?: number | null
          raw_data?: Json
          source?: string
          start_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_metrics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          club_id: string | null
          created_at: string
          external_ids: Json
          full_name: string
          id: string
          normalized_name: string
          position: string
          status: string
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          external_ids?: Json
          full_name: string
          id?: string
          normalized_name: string
          position: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          external_ids?: Json
          full_name?: string
          id?: string
          normalized_name?: string
          position?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          evidence: Json
          explanation: string
          fantasy_team_id: string
          id: string
          player_id: string | null
          recommendation_type: string
          score: number | null
          title: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          evidence?: Json
          explanation: string
          fantasy_team_id: string
          id?: string
          player_id?: string | null
          recommendation_type: string
          score?: number | null
          title: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          evidence?: Json
          explanation?: string
          fantasy_team_id?: string
          id?: string
          player_id?: string | null
          recommendation_type?: string
          score?: number | null
          title?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_players: {
        Row: {
          created_at: string
          current_value: number | null
          fantasy_team_id: string
          id: string
          imported_club: string | null
          imported_name: string | null
          imported_position: string | null
          is_captain: boolean
          is_starter: boolean
          player_id: string | null
          purchase_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          fantasy_team_id: string
          id?: string
          imported_club?: string | null
          imported_name?: string | null
          imported_position?: string | null
          is_captain?: boolean
          is_starter?: boolean
          player_id?: string | null
          purchase_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          fantasy_team_id?: string
          id?: string
          imported_club?: string | null
          imported_name?: string | null
          imported_position?: string | null
          is_captain?: boolean
          is_starter?: boolean
          player_id?: string | null
          purchase_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_players_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          provider_code: string
          records_received: number
          records_upserted: number
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          provider_code: string
          records_received?: number
          records_upserted?: number
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          provider_code?: string
          records_received?: number
          records_upserted?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "data_providers"
            referencedColumns: ["code"]
          },
        ]
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
