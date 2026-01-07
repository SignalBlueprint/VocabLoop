import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create client only if configured
// Using generic client - tables defined in docs/SCHEMA.md
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: SupabaseClient<any> | null = null;

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = supabaseClient;

// Helper to check if cloud features are available
export function canUseCloudFeatures(): boolean {
  return isSupabaseConfigured && supabaseClient !== null;
}
