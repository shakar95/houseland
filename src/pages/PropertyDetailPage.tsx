import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, MessageCircle, Bed, Bath, Maximize, Compass } from 'lucide-react';
import { api } from '@/lib/api';
import { ObfuscatedMap } from '@/components/maps/ObfuscatedMap';
import { VideoEmbed } from '@/components/VideoEmbed';
import { PropertyFlyer } from '@/components/PropertyFlyer';
import type { AgencySettings, Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';

export function PropertyDetailPage() {
  const { t, enumLabel, propertyTitle, propertyDescription } = useLanguage();
  const { code } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [agency, setAgency] = useState<AgencySettings | null>(null);

  useEffect(() => {
    if (!code) return;
    api.get<Property>(`/api/properties/${code}`).then(setProperty).catch(() => {});
    api.get<AgencySettings>('/api/agency').then(setAgency).catch(() => {});
  }, [code]);

  const track = (event: 'phone' | 'whatsapp') => {
    if (!property) return;
    api.post(`/api/properties/${property.id}/analytics`, { event }).catch(() => {});
  };

  if (!property) {
    return <p className="py-20 text-center text-royal-400">{t.property.loading}</p>;
  }

  const title = propertyTitle(property.code, property.title);
  const description = propertyDescription(property.code, property.description ?? '');
  const wa = agency?.whatsapp?.replace(/\D/g, '') ?? '';

  return (
    <div className="app-page pb-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {property.images.map((img, i) => (
            <img key={i} src={img} alt="" className="w-full rounded-xl object-cover" />
          ))}
        </div>
        <div>
          <span className="text-sm text-gold-500">{property.code}</span>
          <h1 className="font-display text-4xl text-white">{title}</h1>
          <p className="mt-2 text-2xl font-semibold text-gold-400">
            {formatPrice(property.price, property.currency)}
          </p>
          <p className="text-royal-300">
            {enumLabel(property.transactionType)} · {enumLabel(property.propertyType)} · {property.neighborhood}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href={`tel:${agency?.phonePrimary}`}
              onClick={() => track('phone')}
              className="btn-gold"
            >
              <Phone className="h-4 w-4" /> {t.property.call}
            </a>
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(`${property.code}: ${title}`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('whatsapp')}
              className="btn-outline-gold"
            >
              <MessageCircle className="h-4 w-4" /> {t.property.whatsapp}
            </a>
          </div>
          <p className="mt-2 text-xs text-royal-500">{t.property.privacyNote}</p>

          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Maximize className="text-gold-500" /> {property.areaSqm} m²
            </div>
            {property.bedrooms != null && (
              <div className="flex items-center gap-2">
                <Bed className="text-gold-500" /> {property.bedrooms} bedrooms
              </div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-2">
                <Bath className="text-gold-500" /> {property.bathrooms} facilities
              </div>
            )}
            {property.facing && (
              <div className="flex items-center gap-2">
                <Compass className="text-gold-500" /> {enumLabel(property.facing)}
              </div>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-royal-200">{description}</p>

          <div className="mt-8">
            <PropertyFlyer property={property} agency={agency} />
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl text-gold-400">{t.property.location}</h2>
        <div className="mt-4">
          <ObfuscatedMap neighborhood={property.neighborhood} />
        </div>
      </div>

      {property.videoLink && (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-gold-400">{t.property.video}</h2>
          <div className="mt-4 max-w-3xl">
            <VideoEmbed url={property.videoLink} />
          </div>
        </div>
      )}
    </div>
  );
}
