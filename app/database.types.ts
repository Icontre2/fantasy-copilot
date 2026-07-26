export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      onboarding_progress: {
        Row: {
          user_id: string;
          current_step: number;
          completed: boolean;
          selected_import_method: "manual" | "csv" | "image" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_step?: number;
          completed?: boolean;
          selected_import_method?: "manual" | "csv" | "image" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current_step?: number;
          completed?: boolean;
          selected_import_method?: "manual" | "csv" | "image" | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      fantasy_teams: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          balance: number;
          squad_value: number | null;
          source: "manual" | "csv" | "image" | "official";
          external_league_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          balance?: number;
          squad_value?: number | null;
          source?: "manual" | "csv" | "image" | "official";
          external_league_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          balance?: number;
          squad_value?: number | null;
          source?: "manual" | "csv" | "image" | "official";
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          short_name: string | null;
          external_ids: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string | null;
          external_ids?: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          short_name?: string | null;
          external_ids?: Json;
        };
        Relationships: Relationship[];
      };
      players: {
        Row: {
          id: string;
          full_name: string;
          normalized_name: string;
          position: "GK" | "DEF" | "MID" | "FWD";
          club_id: string | null;
          status:
            | "available"
            | "doubtful"
            | "injured"
            | "suspended"
            | "unknown";
          external_ids: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          normalized_name: string;
          position: "GK" | "DEF" | "MID" | "FWD";
          club_id?: string | null;
          status?:
            | "available"
            | "doubtful"
            | "injured"
            | "suspended"
            | "unknown";
          external_ids?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          normalized_name?: string;
          position?: "GK" | "DEF" | "MID" | "FWD";
          club_id?: string | null;
          status?:
            | "available"
            | "doubtful"
            | "injured"
            | "suspended"
            | "unknown";
          external_ids?: Json;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      squad_players: {
        Row: {
          id: string;
          fantasy_team_id: string;
          player_id: string | null;
          purchase_price: number | null;
          current_value: number | null;
          is_starter: boolean;
          is_captain: boolean;
          imported_name: string | null;
          imported_position: "GK" | "DEF" | "MID" | "FWD" | null;
          imported_club: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fantasy_team_id: string;
          player_id?: string | null;
          purchase_price?: number | null;
          current_value?: number | null;
          is_starter?: boolean;
          is_captain?: boolean;
          imported_name?: string | null;
          imported_position?: "GK" | "DEF" | "MID" | "FWD" | null;
          imported_club?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          player_id?: string | null;
          purchase_price?: number | null;
          current_value?: number | null;
          is_starter?: boolean;
          is_captain?: boolean;
          imported_name?: string | null;
          imported_position?: "GK" | "DEF" | "MID" | "FWD" | null;
          imported_club?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      market_entries: {
        Row: {
          id: string;
          fantasy_team_id: string;
          player_id: string;
          asking_price: number | null;
          market_value: number | null;
          seller_name: string | null;
          expires_at: string | null;
          captured_at: string;
          source: "manual" | "csv" | "image" | "official";
        };
        Insert: {
          id?: string;
          fantasy_team_id: string;
          player_id: string;
          asking_price?: number | null;
          market_value?: number | null;
          seller_name?: string | null;
          expires_at?: string | null;
          captured_at?: string;
          source?: "manual" | "csv" | "image" | "official";
        };
        Update: {
          asking_price?: number | null;
          market_value?: number | null;
          seller_name?: string | null;
          expires_at?: string | null;
        };
        Relationships: Relationship[];
      };
      recommendations: {
        Row: {
          id: string;
          fantasy_team_id: string;
          player_id: string | null;
          recommendation_type:
            | "buy"
            | "sell"
            | "hold"
            | "start"
            | "bench"
            | "captain";
          score: number | null;
          title: string;
          explanation: string;
          evidence: Json;
          valid_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fantasy_team_id: string;
          player_id?: string | null;
          recommendation_type:
            | "buy"
            | "sell"
            | "hold"
            | "start"
            | "bench"
            | "captain";
          score?: number | null;
          title: string;
          explanation: string;
          evidence?: Json;
          valid_until?: string | null;
          created_at?: string;
        };
        Update: {
          score?: number | null;
          title?: string;
          explanation?: string;
          evidence?: Json;
          valid_until?: string | null;
        };
        Relationships: Relationship[];
      };
      player_availability: {
        Row: {
          id: string;
          player_id: string;
          provider_code: string;
          status:
            | "available"
            | "doubtful"
            | "injured"
            | "suspended"
            | "unknown";
          reason: string | null;
          start_date: string | null;
          expected_return: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: Relationship[];
      };
      fixtures: {
        Row: {
          id: string;
          provider_code: string;
          external_id: string;
          competition_code: string;
          season: number;
          round: string | null;
          kickoff_at: string | null;
          home_club_id: string | null;
          away_club_id: string | null;
          home_score: number | null;
          away_score: number | null;
          status: string;
          raw_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: Relationship[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
