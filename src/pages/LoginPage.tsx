import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { signInWithGoogle, signInWithPassword } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export function LoginPage() {
  const { t } = useLanguage();
  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && profile) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
      await refreshProfile();
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')
          ? t.auth.invalidCredentials
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page flex min-h-[60vh] flex-col justify-center py-8">
      <h1 className="text-center text-2xl font-bold text-gold-400">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-center text-sm text-royal-400">{t.auth.loginSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="filter-label">{t.auth.email}</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-500" />
            <input
              type="email"
              required
              autoComplete="email"
              className="input-app !ps-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@houseland.iq"
            />
          </div>
        </div>
        <div>
          <label className="filter-label">{t.auth.password}</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-500" />
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input-app !ps-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-gold w-full">
          <LogIn className="h-4 w-4" />
          {submitting ? t.common.loading : t.auth.loginButton}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-royal-800" />
        <span className="text-xs text-royal-500">{t.auth.orGoogle}</span>
        <div className="h-px flex-1 bg-royal-800" />
      </div>

      <button type="button" onClick={() => signInWithGoogle()} className="btn-outline-gold w-full">
        Google
      </button>
    </div>
  );
}
