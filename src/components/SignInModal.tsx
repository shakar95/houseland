import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Home, Lock, LogIn, Mail, X } from 'lucide-react';
import { signInWithGoogle, signInWithPassword } from '@/lib/supabase';
import { getAuthErrorKey, getAuthErrorRaw } from '@/lib/authErrors';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function SignInModal({ open, onClose, onSuccess }: SignInModalProps) {
  const { t } = useLanguage();
  const { refreshProfile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = useCallback(() => {
    onClose();
    setShowEmail(false);
    setError('');
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setActive(false);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const onCardTransitionEnd = () => {
    if (!active) {
      setVisible(false);
      setShowEmail(false);
      setEmail('');
      setPassword('');
      setError('');
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
      await refreshProfile();
      onSuccess?.();
      close();
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

  if (!visible) return null;

  return createPortal(
    <div className="signin-modal-root" aria-hidden={!active}>
      <button
        type="button"
        aria-label={t.app.closeMenu}
        className={`signin-modal-backdrop ${active ? 'signin-modal-backdrop--open' : ''}`}
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-modal-title"
        className={`signin-modal-card ${active ? 'signin-modal-card--open' : ''}`}
        onTransitionEnd={onCardTransitionEnd}
      >
        <button
          type="button"
          onClick={close}
          aria-label={t.app.closeMenu}
          className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-royal-400 transition hover:bg-royal-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950 shadow-lg shadow-gold-500/30 ring-4 ring-gold-500/20">
            <Home className="h-8 w-8" strokeWidth={2.25} />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gold-300">Houseland</p>
          <p className="text-[11px] text-royal-400">{t.common.sulaymaniyah}</p>
        </div>

        <h2 id="signin-modal-title" className="mt-5 text-center text-lg font-semibold text-white">
          {t.submit.signInTitle}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-royal-300">{t.submit.signInDesc}</p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-royal-600 bg-white px-4 py-3 text-sm font-semibold text-royal-900 shadow-md transition hover:bg-royal-50 active:scale-[0.98]"
          >
            <GoogleIcon />
            {t.submit.continueGoogle}
          </button>

          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="mx-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-royal-400 transition hover:bg-royal-800/60 hover:text-gold-300"
            >
              <Mail className="h-3.5 w-3.5" />
              {t.auth.continueWithEmail}
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3 rounded-xl border border-royal-700/60 bg-royal-900/50 p-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder={t.auth.email}
                  className="input-app !py-2.5 !ps-10 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-500" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder={t.auth.password}
                  className="input-app !py-2.5 !ps-10 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300">{error}</p>
              )}

              <button type="submit" disabled={submitting} className="btn-gold w-full !py-2.5 text-sm">
                <LogIn className="h-4 w-4" />
                {submitting ? t.common.loading : t.auth.loginButton}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
