import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, canUseCloudFeatures } from '../lib/supabase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Sign in with email magic link
 */
export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  if (!canUseCloudFeatures() || !supabase) {
    return { error: 'Cloud sync is not configured' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  if (!canUseCloudFeatures() || !supabase) {
    return { error: 'Cloud sync is not configured' };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  // Clear local sync data
  localStorage.removeItem('vocabloop_last_sync');

  return { error: null };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!canUseCloudFeatures() || !supabase) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  if (!canUseCloudFeatures() || !supabase) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): (() => void) | undefined {
  if (!canUseCloudFeatures() || !supabase) {
    return undefined;
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

  return () => subscription.unsubscribe();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get user email
 */
export async function getUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email ?? null;
}

/**
 * Create or update user profile after sign in
 */
export async function ensureUserProfile(): Promise<{ error: string | null }> {
  if (!canUseCloudFeatures() || !supabase) {
    return { error: 'Cloud sync is not configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      { id: user.id },
      { onConflict: 'id' }
    );

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
