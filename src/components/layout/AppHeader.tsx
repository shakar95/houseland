import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

export function AppHeader() {
  const { t } = useLanguage();

  return (
    <header className="app-header">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-royal-950 shadow-md shadow-gold-500/25">
          <Home className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <span className="text-base font-bold text-white">Houseland</span>
          <p className="text-[10px] text-royal-400">{t.common.sulaymaniyah}</p>
        </div>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
