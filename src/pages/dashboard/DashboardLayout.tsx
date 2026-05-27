import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BarChart3, Building2, Users, Settings, UserCircle } from 'lucide-react';

export function DashboardLayout() {
  const { profile, loading } = useAuth();
  const { t } = useLanguage();

  const links = [
    { to: '/dashboard', end: true, label: t.dashboard.analytics, icon: BarChart3 },
    { to: '/dashboard/properties', label: t.dashboard.properties, icon: Building2 },
    { to: '/dashboard/crm', label: t.dashboard.crm, icon: Users },
    { to: '/dashboard/staff', label: t.dashboard.staff, icon: UserCircle },
    { to: '/dashboard/settings', label: t.dashboard.settings, icon: Settings },
  ];

  if (loading) return <p className="py-20 text-center">{t.common.loading}</p>;
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'STAFF')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="card-luxury shrink-0 p-4 lg:w-56">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-gold-400">{t.dashboard.title}</h2>
          <LanguageSwitcher />
        </div>
        <p className="text-xs text-royal-400">{profile.role}</p>
        <nav className="mt-4 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-gold-500/20 text-gold-300' : 'text-royal-200 hover:bg-royal-800'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
