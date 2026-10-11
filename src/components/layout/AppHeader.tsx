import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppMenu } from '@/components/AppMenu';
import { useLanguage } from '@/context/LanguageContext';
import { APP_NAME } from '@/lib/brand';

export function AppHeader() {
  const { t, rtl } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/' || location.pathname === '/listings';
  const BackIcon = rtl ? ChevronRight : ChevronLeft;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header className={`app-header ${isHome ? 'border-b-0' : 'border-b border-royal-800/80'}`}>
      {isHome ? (
        <div className="h-8 w-8 shrink-0" aria-hidden="true" />
      ) : (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-royal-900/80 text-white shadow-sm backdrop-blur-md transition-all active:scale-90 hover:bg-royal-800 hover:border-gold-500/40 cursor-pointer"
        >
          <BackIcon className="h-4.5 w-4.5 text-gold-300" />
        </button>
      )}
      <Link to="/" dir="ltr" className="mx-auto flex items-center gap-2 active:scale-95 transition-transform duration-150">
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
