import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Home } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signInWithGoogle, signOut } from '@/lib/supabase';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/listings', label: 'Listings' },
  { to: '/submit', label: 'Submit Property' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  return (
    <header className="sticky top-0 z-50 border-b border-royal-800/80 bg-royal-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-2xl font-bold tracking-wide text-gold-300">Houseland</span>
            <p className="text-xs text-royal-400">Sulaymaniyah · Iraq</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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
              Dashboard
            </NavLink>
          )}
          {profile ? (
            <button type="button" onClick={() => signOut()} className="btn-outline-gold text-sm">
              Sign out
            </button>
          ) : (
            <button type="button" onClick={() => signInWithGoogle()} className="btn-gold text-sm">
              Sign in
            </button>
          )}
        </nav>

        <button type="button" className="md:hidden text-gold-400" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-royal-800 px-4 py-4 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="block py-2 text-royal-100" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          {isStaff && (
            <Link to="/dashboard" className="block py-2 text-gold-400" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
