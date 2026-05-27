import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      refreshProfile().then(() => navigate('/'));
    });
  }, [navigate, refreshProfile]);

  return <p className="py-20 text-center text-royal-400">Completing sign in...</p>;
}
