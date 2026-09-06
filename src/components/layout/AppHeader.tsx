import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { AppMenu } from '@/components/AppMenu';
import { useLanguage } from '@/context/LanguageContext';
import { APP_NAME } from '@/lib/brand';

export function AppHeader() {
  const { t } = useLanguage();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/listings';

  return (
    <header className={`app-header ${isHome ? 'border-b-0' : 'border-b border-royal-800/80'}`}>
      <div className="h-8 w-8 shrink-0" aria-hidden="true" />
      <Link to="/" dir="ltr" className="mx-auto flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950 shadow-md shadow-gold-500/25">
          <Home className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col items-center text-center leading-tight">
          <span className="text-sm font-bold text-white tracking-wide sm:text-base">{APP_NAME}</span>
          <p className="text-[9.5px] font-medium text-gold-400/85" dir="auto">{t.common.sulaymaniyah}</p>
        </div>
      </Link>
      <AppMenu />
    </header>
  );
}
