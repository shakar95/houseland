import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { api, clearAuthTokenCache } from '@/lib/api';
import { setCachedAuthToken } from '@/lib/authTokenCache';
import type { Profile } from '@/types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await api.get<Profile>('/api/me');
      setProfile(me);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        setCachedAuthToken(data.session.access_token);
        refreshProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // Defer so Supabase can finish persisting the session before we call getSession/API
      queueMicrotask(() => {
        if (session?.access_token) {
          setCachedAuthToken(session.access_token);
          void refreshProfile();
        } else {
          clearAuthTokenCache();
          setProfile(null);
        }
      });
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  return (
    <AuthContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
