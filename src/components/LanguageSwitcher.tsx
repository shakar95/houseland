import { useLanguage } from '@/context/LanguageContext';
import type { Lang } from '@/i18n';

const langs: Lang[] = ['ku', 'ar', 'en'];

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className={`flex rounded-lg border border-royal-700 bg-royal-900/80 p-0.5 text-xs ${className}`}>
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            lang === l ? 'bg-gold-500 text-royal-950' : 'text-royal-300 hover:text-gold-300'
          }`}
        >
          {t.lang[l]}
        </button>
      ))}
    </div>
  );
}
