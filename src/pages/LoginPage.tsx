import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Wrench } from 'lucide-react';
import { signInWithGoogle, signInWithPassword } from '@/lib/supabase';
import { getAuthErrorKey, getAuthErrorRaw } from '@/lib/authErrors';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const isDev = import.meta.env.DEV;

export function LoginPage() {
  const { t } = useLanguage();
  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@houseland.iq');
  const [password, setPassword] = useState('HouselandAdmin2026!');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  if (!loading && profile) {
    return <Navigate to="/" replace />;
  }

  const handleSetupTestUsers = async () => {
    setError('');
    setSuccess('');
    setSettingUp(true);
    try {
      await api.post<{ ok: boolean }>('/api/dev/ensure-test-users', {});
      setSuccess(t.auth.setupSuccess);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('SERVICE_ROLE') ? t.auth.noServiceKey : `${t.auth.setupFailed}: ${msg}`);
    } finally {
      setSettingUp(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
      await refreshProfile();
      navigate('/');
    } catch (err) {
      const key = getAuthErrorKey(err);
      if (key === 'notInAuth') setError(t.auth.notInAuth);
      else if (key === 'checkEmail') setError(t.auth.checkEmail);
      else if (key === 'invalidCredentials') setError(t.auth.invalidCredentials);
      else setError(getAuthErrorRaw(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page flex min-h-[60vh] flex-col justify-center py-8">
      <h1 className="text-center text-2xl font-bold text-gold-400">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-center text-sm text-royal-400">{t.auth.loginSubtitle}</p>

      {isDev && (
        <div className="mt-6 rounded-xl border border-gold-500/30 bg-gold-500/10 p-4">
          <p className="text-xs text-gold-200">{t.auth.setupHint}</p>
          <button
            type="button"
            onClick={handleSetupTestUsers}
            disabled={settingUp}
            className="btn-outline-gold mt-3 w-full text-sm"
          >
            <Wrench className="h-4 w-4" />
            {settingUp ? t.common.loading : t.auth.setupButton}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
        {success && <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">{success}</p>}

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
