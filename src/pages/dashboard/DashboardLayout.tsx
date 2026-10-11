import { NavLink, Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AppMenu } from '@/components/AppMenu';
import {
  BarChart3,
  Building2,
  Users,
  Settings,
  UserCircle,
  Home,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export function DashboardLayout() {
  const { profile, loading } = useAuth();
  const { t, rtl } = useLanguage();
  const location = useLocation();

  const links = [
    { to: '/dashboard', end: true, label: 'ئینسایتس و ئامار', icon: BarChart3 },
    { to: '/dashboard/properties', label: 'بەڕێوەبردنی موڵک', icon: Building2 },
    { to: '/dashboard/crm', label: 'کڕیاران و CRM', icon: Users },
    { to: '/dashboard/neighborhoods', label: 'گەڕەکەکان', icon: MapPin },
    { to: '/dashboard/staff', label: 'ستاف و تیم', icon: UserCircle },
    { to: '/dashboard/settings', label: 'ڕێکخستن', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gold-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
          <span className="text-sm font-semibold">{t.common.loading}</span>
        </div>
      </div>
    );
  }

  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'STAFF')) {
    return <Navigate to="/" replace />;
  }

  const BackIcon = rtl ? ChevronRight : ChevronLeft;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col lg:flex-row lg:gap-8 lg:px-6 lg:py-8">
      {/* Mobile Sticky Header & Horizontal Tabs Navigation */}
      <div className="sticky top-0 z-40 border-b border-royal-800/80 bg-royal-950/95 px-4 pt-3 pb-2 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3 pb-2.5">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-royal-700/80 bg-royal-900/80 text-royal-300 transition active:scale-95 hover:border-gold-500/50 hover:text-gold-300"
              title="گەڕانەوە بۆ ماڵەوە"
            >
              <BackIcon className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold text-white">داشبۆردی سەرەکی</span>
                <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-gold-400 border border-gold-500/30">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppMenu />
          </div>
        </div>

        {/* Scrollable horizontal pills for mobile */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {links.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === '/dashboard' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  active
                    ? 'border border-gold-500/50 bg-gold-500/20 text-gold-300 shadow-sm shadow-gold-500/10'
                    : 'border border-royal-800/80 bg-royal-900/60 text-royal-300 hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-gold-400' : 'text-royal-400'}`} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Desktop Luxury Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between rounded-3xl border border-royal-800/80 bg-gradient-to-b from-royal-900/90 via-royal-950 to-royal-950 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div>
          {/* Header & Logo */}
          <div className="flex items-center justify-between border-b border-royal-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950 shadow-md shadow-gold-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-white tracking-wide">Houseland</h2>
                <p className="text-[10px] font-medium text-gold-400/90">بەڕێوەبردنی گشتی</p>
              </div>
            </div>
            <AppMenu />
          </div>

          {/* User Profile Card */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-royal-800/80 bg-royal-900/40 p-3 shadow-inner">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400 border border-gold-500/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{profile.fullName || profile.email}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-gold-400">{profile.role}</span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="mt-5 space-y-1.5">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'border border-gold-500/40 bg-gradient-to-r from-gold-500/20 to-gold-500/10 text-gold-300 shadow-sm shadow-gold-500/10'
                      : 'text-royal-300 hover:bg-royal-800/60 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0 text-gold-400" />
                <span className="flex-1 text-start">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-royal-800/80 pt-4">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-royal-700/80 bg-royal-900/60 px-3 py-2.5 text-xs font-semibold text-royal-200 transition-all hover:border-gold-500/40 hover:text-gold-300 active:scale-95"
          >
            <Home className="h-4 w-4 text-gold-400" />
            <span>گەڕانەوە بۆ پەڕەی سەرەکی</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 px-4 py-4 lg:px-0 lg:py-0">
        <Outlet />
      </main>
    </div>
  );
}
