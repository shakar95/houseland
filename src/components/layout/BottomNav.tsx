import { NavLink, useLocation } from 'react-router-dom';
import { Building2, PlusCircle, Info, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export function BottomNav() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  const tabs = [
    { to: '/', label: t.nav.properties, icon: Building2, end: true },
    { to: '/submit', label: t.nav.add, icon: PlusCircle, highlight: true },
    { to: '/about', label: t.nav.about, icon: Info },
    {
      to: isStaff ? '/dashboard' : profile ? '/submit' : '/login',
      label: isStaff ? t.nav.dashboard : profile ? t.nav.profile : t.auth.signIn,
      icon: User,
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Main">
      {tabs.map(({ to, label, icon: Icon, end, highlight }) => {
        const active = end ? location.pathname === '/' : location.pathname.startsWith(to) && to !== '/';
        if (highlight) {
          return (
            <NavLink
              key={to}
              to={to}
              className="bottom-nav-fab"
              aria-label={t.app.addProperty}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950 shadow-lg shadow-gold-500/40 ring-4 ring-royal-950">
                <PlusCircle className="h-7 w-7" strokeWidth={2.25} />
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-gold-400">{label}</span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
