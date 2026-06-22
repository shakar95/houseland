import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Home } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AppMenu } from '@/components/AppMenu';
import { signInWithGoogle, signOut } from '@/lib/supabase';
import { APP_NAME } from '@/lib/brand';

export function Header() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const { t } = useLanguage();
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  const nav = [
    { to: '/', label: t.nav.home },
    { to: '/listings', label: t.nav.listings },
    { to: '/submit', label: t.nav.submit },
    { to: '/about', label: t.nav.about },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-royal-800/80 bg-royal-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-wide text-gold-300 sm:text-2xl">{APP_NAME}</span>
            <p className="text-xs text-royal-400">{t.common.sulaymaniyah}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 lg:flex">
          <AppMenu />
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-gold-400' : 'text-royal-200 hover:text-gold-300'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          {isStaff && (
            <NavLink to="/dashboard" className="btn-gold text-sm !py-1.5 !px-3">
              {t.nav.dashboard}
            </NavLink>
          )}
          {profile ? (
            <button type="button" onClick={() => signOut()} className="btn-outline-gold text-sm">
              {t.auth.signOut}
            </button>
          ) : (
            <button type="button" onClick={() => signInWithGoogle()} className="btn-gold text-sm">
              {t.auth.signIn}
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <AppMenu />
          <button type="button" className="text-gold-400" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-royal-800 px-4 py-4 lg:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="block py-2 text-royal-100" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          {isStaff && (
            <Link to="/dashboard" className="block py-2 text-gold-400" onClick={() => setOpen(false)}>
              {t.nav.dashboard}
            </Link>
          )}
          {profile ? (
            <button type="button" onClick={() => signOut()} className="mt-2 text-sm text-royal-300">
              {t.auth.signOut}
            </button>
          ) : (
            <button type="button" onClick={() => signInWithGoogle()} className="mt-2 btn-gold text-sm">
              {t.auth.signIn}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
