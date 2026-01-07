import { useState, useEffect, useCallback } from 'react';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { onAuthStateChange, getCurrentUser, ensureUserProfile } from '../utils/auth';
import { canUseCloudFeatures } from '../lib/supabase';
import { syncAll, clearSyncData } from '../utils/sync';

export interface AuthState {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isConfigured: canUseCloudFeatures(),
  });

  // Initialize auth state
  useEffect(() => {
    if (!canUseCloudFeatures()) {
      setState({ user: null, loading: false, isConfigured: false });
      return;
    }

    // Get initial user
    getCurrentUser().then((user) => {
      setState((s) => ({ ...s, user, loading: false }));

      // If user is logged in, trigger initial sync
      if (user) {
        ensureUserProfile();
        syncAll();
      }
    });

    // Listen for auth changes
    const unsubscribe = onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        const user = session?.user ?? null;
        setState((s) => ({ ...s, user, loading: false }));

        if (event === 'SIGNED_IN' && user) {
          // User just signed in - ensure profile and sync
          ensureUserProfile();
          syncAll();
        } else if (event === 'SIGNED_OUT') {
          // User signed out - clear sync data
          clearSyncData();
        }
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleSignOut = useCallback(() => {
    setState((s) => ({ ...s, user: null }));
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    isConfigured: state.isConfigured,
    isAuthenticated: state.user !== null,
    email: state.user?.email ?? null,
    handleSignOut,
  };
}
