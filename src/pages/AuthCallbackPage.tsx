import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { clearAuthTokenCache } from '@/lib/api';
import { setCachedAuthToken } from '@/lib/authTokenCache';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    clearAuthTokenCache();
    supabase.auth.getSession().then(({ data }) => {
      setCachedAuthToken(data.session?.access_token ?? null);
      refreshProfile().then(() => navigate('/'));
    });
  }, [navigate, refreshProfile]);

  return <p className="py-20 text-center text-royal-400">Completing sign in...</p>;
}
