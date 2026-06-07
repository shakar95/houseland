import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  Check,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { signOut, supabase, supabaseConfigured } from '@/lib/supabase';
import type { Lang } from '@/i18n';

const langs: Lang[] = ['ku', 'ar', 'en'];
const COVER_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80';

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AppMenu({ className = '' }: { className?: string }) {
  const { profile } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const aboutActive = location.pathname === '/about';
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  const close = useCallback(() => setOpen(false), []);

  const openMenu = () => setOpen(true);

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

  useEffect(() => {
    if (!supabaseConfigured || !profile) {
      setAvatarUrl(null);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, string> | undefined;
      setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null);
    });
  }, [profile]);

  const onPanelTransitionEnd = () => {
    if (!active) setVisible(false);
  };

  const displayName = profile?.fullName ?? t.app.guest;
  const displayEmail = profile?.email ?? t.app.signInHint;

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.app.menu}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-royal-700 bg-royal-900/80 text-royal-200 transition hover:border-royal-600 hover:text-gold-300 ${className}`}
      >
        <Menu className="h-4 w-4" />
      </button>

      {visible &&
        createPortal(
          <div className="app-menu-root" aria-hidden={!active}>
            <button
              type="button"
              aria-label={t.app.closeMenu}
              className={`app-menu-backdrop ${active ? 'app-menu-backdrop--open' : ''}`}
              onClick={close}
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t.app.menu}
              className={`app-menu-panel ${active ? 'app-menu-panel--open' : ''}`}
              onTransitionEnd={onPanelTransitionEnd}
            >
              <div className="relative shrink-0">
                <div className="relative h-40 overflow-hidden">
                  <img src={COVER_IMAGE} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-royal-950 via-royal-950/50 to-royal-900/20" />
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t.app.closeMenu}
                    className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-royal-950/50 text-white backdrop-blur-sm transition hover:bg-royal-950/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative px-5 pb-4">
                  <div className="-mt-14 flex items-end gap-3">
                    <div className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-royal-950 bg-gradient-to-br from-royal-700 to-royal-900 shadow-lg ring-2 ring-gold-500/30">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : profile ? (
                        <span className="text-xl font-bold text-gold-300">{getInitials(displayName)}</span>
                      ) : (
                        <User className="h-8 w-8 text-royal-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="truncate text-base font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-royal-400">{displayEmail}</p>
                      {profile && (
                        <span className="mt-1 inline-block rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-medium text-gold-300">
                          {profile.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-royal-500">
                  {t.app.language}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {langs.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        lang === l
                          ? 'bg-gold-500/15 text-gold-300'
                          : 'text-royal-200 hover:bg-royal-900 hover:text-gold-300'
                      }`}
                    >
                      <Check className={`h-4 w-4 shrink-0 ${lang === l ? 'opacity-100' : 'opacity-0'}`} />
                      {t.lang[l]}
                    </button>
                  ))}
                </div>

                <div className="my-4 border-t border-royal-800" />

                <nav className="flex flex-col gap-1">
                  <Link
                    to="/about"
                    onClick={close}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      aboutActive
                        ? 'bg-gold-500/15 text-gold-300'
                        : 'text-royal-200 hover:bg-royal-900 hover:text-gold-300'
                    }`}
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    {t.nav.about}
                  </Link>

                  {isStaff && (
                    <Link
                      to="/dashboard"
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-royal-200 transition hover:bg-royal-900 hover:text-gold-300"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0" />
                      {t.nav.dashboard}
                    </Link>
                  )}

                  {profile ? (
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        signOut();
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-royal-200 transition hover:bg-royal-900 hover:text-red-300"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      {t.auth.signOut}
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gold-300 transition hover:bg-royal-900"
                    >
                      <LogIn className="h-4 w-4 shrink-0" />
                      {t.auth.signIn}
                    </Link>
                  )}
                </nav>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
