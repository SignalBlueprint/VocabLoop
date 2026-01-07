/**
 * Supabase Database Types
 *
 * These types mirror the PostgreSQL schema defined in docs/SCHEMA.md
 */

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          last_sync_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          last_sync_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          last_sync_at?: string | null;
          created_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          type: 'BASIC' | 'CLOZE' | 'VERB';
          front: string;
          back: string;
          example_es: string | null;
          example_en: string | null;
          notes: string | null;
          tags: string[];
          cloze_sentence: string | null;
          cloze_word: string | null;
          ease: number;
          interval_days: number;
          reps: number;
          due_at: number;
          lapses: number;
          last_reviewed_at: number | null;
          created_at: number;
          updated_at: number;
          server_updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          type: 'BASIC' | 'CLOZE' | 'VERB';
          front: string;
          back: string;
          example_es?: string | null;
          example_en?: string | null;
          notes?: string | null;
          tags?: string[];
          cloze_sentence?: string | null;
          cloze_word?: string | null;
          ease?: number;
          interval_days?: number;
          reps?: number;
          due_at: number;
          lapses?: number;
          last_reviewed_at?: number | null;
          created_at: number;
          updated_at: number;
          server_updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'BASIC' | 'CLOZE' | 'VERB';
          front?: string;
          back?: string;
          example_es?: string | null;
          example_en?: string | null;
          notes?: string | null;
          tags?: string[];
          cloze_sentence?: string | null;
          cloze_word?: string | null;
          ease?: number;
          interval_days?: number;
          reps?: number;
          due_at?: number;
          lapses?: number;
          last_reviewed_at?: number | null;
          created_at?: number;
          updated_at?: number;
          server_updated_at?: string;
          deleted_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          reviewed_at: number;
          grade: 'again' | 'hard' | 'good' | 'easy';
          previous_interval: number;
          new_interval: number;
          previous_due_at: number;
          new_due_at: number;
          server_created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          card_id: string;
          reviewed_at: number;
          grade: 'again' | 'hard' | 'good' | 'easy';
          previous_interval: number;
          new_interval: number;
          previous_due_at: number;
          new_due_at: number;
          server_created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          reviewed_at?: number;
          grade?: 'again' | 'hard' | 'good' | 'easy';
          previous_interval?: number;
          new_interval?: number;
          previous_due_at?: number;
          new_due_at?: number;
          server_created_at?: string;
        };
      };
      sync_log: {
        Row: {
          id: string;
          user_id: string;
          action: 'upload' | 'download' | 'merge' | 'conflict_resolved';
          timestamp: string;
          cards_affected: number;
          reviews_affected: number;
          payload_hash: string | null;
          details: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: 'upload' | 'download' | 'merge' | 'conflict_resolved';
          timestamp?: string;
          cards_affected?: number;
          reviews_affected?: number;
          payload_hash?: string | null;
          details?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: 'upload' | 'download' | 'merge' | 'conflict_resolved';
          timestamp?: string;
          cards_affected?: number;
          reviews_affected?: number;
          payload_hash?: string | null;
          details?: Record<string, unknown> | null;
        };
      };
    };
    Functions: {
      get_card_changes: {
        Args: {
          p_user_id: string;
          p_since: string;
        };
        Returns: Database['public']['Tables']['cards']['Row'][];
      };
    };
  };
}

// Type aliases for convenience
export type DbCard = Database['public']['Tables']['cards']['Row'];
export type DbCardInsert = Database['public']['Tables']['cards']['Insert'];
export type DbReview = Database['public']['Tables']['reviews']['Row'];
export type DbReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type DbSyncLog = Database['public']['Tables']['sync_log']['Row'];
export type DbSyncLogInsert = Database['public']['Tables']['sync_log']['Insert'];
