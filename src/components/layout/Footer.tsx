import { useEffect, useState } from 'react';
import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { APP_NAME } from '@/lib/brand';
import type { AgencySettings } from '@/types';

export function Footer() {
  const { t } = useLanguage();
  const [agency, setAgency] = useState<AgencySettings | null>(null);

  useEffect(() => {
    api.get<AgencySettings>('/api/agency').then(setAgency).catch(() => {});
  }, []);

  return (
    <footer className="mt-auto border-t border-royal-800 bg-royal-900/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <h3 className="font-display text-2xl text-gold-400">{agency?.name ?? APP_NAME}</h3>
          <p className="mt-2 text-sm text-royal-300">{t.footer.tagline}</p>
        </div>
        <div className="space-y-3 text-sm text-royal-200">
          {agency?.phonePrimary && (
            <a href={`tel:${agency.phonePrimary}`} className="flex items-center gap-2 hover:text-gold-400">
              <Phone className="h-4 w-4 text-gold-500" />
              {agency.phonePrimary}
            </a>
          )}
          {agency?.whatsapp && (
            <a
              href={`https://wa.me/${agency.whatsapp.replace(/\D/g, '')}`}
              className="flex items-center gap-2 hover:text-gold-400"
            >
              <MessageCircle className="h-4 w-4 text-gold-500" />
              {t.footer.whatsapp}
            </a>
          )}
          {agency?.address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              {agency.address}
            </p>
          )}
        </div>
        <div className="text-sm text-royal-400">
          <p>
            © {new Date().getFullYear()} {agency?.name ?? APP_NAME}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
