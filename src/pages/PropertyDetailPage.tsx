import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, MessageCircle, Bed, Bath, Maximize, Compass, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { PropertyImageGallery } from '@/components/PropertyImageGallery';
import { ObfuscatedMap } from '@/components/maps/ObfuscatedMap';
import type { AgencySettings, Property } from '@/types';
import { formatPrice, formatCountLabel, pickCountLabel } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';

export function PropertyDetailPage() {
  const { t, enumLabel, propertyTitle, propertyDescription } = useLanguage();
  const { code } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [agency, setAgency] = useState<AgencySettings | null>(null);

  useEffect(() => {
    if (!code) return;
    api.get<Property>(`/api/properties/${code}`, { auth: false }).then(setProperty).catch(() => {});
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
    <div className="app-page property-detail pb-6">
      <div className="property-detail-layout">
        <section className="property-detail-media">
          <PropertyImageGallery
            className="property-gallery--detail"
            images={property.images}
            videoUrl={property.videoLink}
            alt={title}
          />
        </section>

        <section className="property-detail-info">
          <span className="text-sm text-gold-500">{property.code}</span>
          <h1 className="property-detail-title">{title}</h1>
          <p className="property-detail-price">{formatPrice(property.price, property.currency)}</p>
          <p className="property-detail-meta text-royal-300">
            {enumLabel(property.transactionType)} · {enumLabel(property.propertyType)} · {property.neighborhood}
          </p>

          <div className="property-detail-actions">
            <a
              href={`tel:${agency?.phonePrimary}`}
              onClick={() => track('phone')}
              className="btn-gold property-detail-btn"
            >
              <Phone className="h-4 w-4" /> {t.property.call}
            </a>
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(`${property.code}: ${title}`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('whatsapp')}
              className="btn-outline-gold property-detail-btn"
            >
              <MessageCircle className="h-4 w-4" /> {t.property.whatsapp}
            </a>
          </div>
          <p className="mt-2 text-xs text-royal-500">{t.property.privacyNote}</p>

          <div className="property-detail-stats">
            <div className="property-detail-stat">
              <Maximize className="shrink-0 text-gold-500" />
              <span>{formatCountLabel(t.property.areaSqm, property.areaSqm)}</span>
            </div>
            {property.bedrooms != null && (
              <div className="property-detail-stat">
                <Bed className="shrink-0 text-gold-500" />
                <span>{pickCountLabel(property.bedrooms, t.property.bedroom, t.property.bedrooms)}</span>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="property-detail-stat">
                <Bath className="shrink-0 text-gold-500" />
                <span>{pickCountLabel(property.bathrooms, t.property.bathroom, t.property.bathrooms)}</span>
              </div>
            )}
            {property.floors != null && (
              <div className="property-detail-stat">
                <Layers className="shrink-0 text-gold-500" />
                <span>{formatCountLabel(t.property.floors, property.floors)}</span>
              </div>
            )}
            {property.facing && (
              <div className="property-detail-stat property-detail-stat--wide">
                <Compass className="shrink-0 text-gold-500" />
                <span>
                  {t.property.facing}: {enumLabel(property.facing)}
                </span>
              </div>
            )}
          </div>

          <p className="property-detail-description">{description}</p>
        </section>
      </div>

      <section className="property-detail-map mt-10 sm:mt-12">
        <h2 className="font-display text-xl text-gold-400 sm:text-2xl">{t.property.location}</h2>
        <div className="mt-4">
          <ObfuscatedMap neighborhood={property.neighborhood} />
        </div>
      </section>
    </div>
  );
}
