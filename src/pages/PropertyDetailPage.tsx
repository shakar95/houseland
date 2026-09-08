import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  Bed,
  Bath,
  Maximize,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp,
  Ruler,
  Route,
  MapPin,
  Edit3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PropertyImageGallery } from '@/components/PropertyImageGallery';
import { ObfuscatedMap } from '@/components/maps/ObfuscatedMap';
import type { AgencySettings, Property } from '@/types';
import { formatPrice, formatCountLabel, pickCountLabel } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { useNeighborhoods, getNeighborhoodLabelByName } from '@/hooks/useNeighborhoods';


export function PropertyDetailPage() {
  const { t, lang, enumLabel, propertyTitle, propertyDescription } = useLanguage();
  const { neighborhoods } = useNeighborhoods();
  const { profile } = useAuth();
  const { code } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsExpanded(false);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    api.get<Property>(`/api/properties/${code}`, { auth: false, cacheMs: 300000 }).then(setProperty).catch(() => {});
    api.get<AgencySettings>('/api/agency').then(setAgency).catch(() => {});
  }, [code]);

  const track = (event: 'phone' | 'whatsapp') => {
    if (!property) return;
    api.post(`/api/properties/${property.id}/analytics`, { event }).catch(() => {});
  };

  const title = property ? propertyTitle(property.code, property.title) : '';
  const description = property ? propertyDescription(property.code, property.description ?? '') : '';
  const wa = agency?.whatsapp?.replace(/\D/g, '') ?? '';

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!isExpanded) {
        setCanExpand(el.scrollHeight > el.clientHeight + 2);
      }
    };

    const id = requestAnimationFrame(checkOverflow);
    window.addEventListener('resize', checkOverflow);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [description, isExpanded]);

  if (!property) {
    return <p className="py-20 text-center text-royal-400">{t.property.loading}</p>;
  }

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
            {enumLabel(property.transactionType)} · {enumLabel(property.propertyType)} · {getNeighborhoodLabelByName(property.neighborhood, neighborhoods, lang)}
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
            {property.frontageMeters != null && (
              <div className="property-detail-stat">
                <Ruler className="shrink-0 text-gold-500" />
                <span>{t.property.frontage}: {property.frontageMeters} m</span>
              </div>
            )}
            {property.streetWidth != null && (
              <div className="property-detail-stat">
                <Route className="shrink-0 text-gold-500" />
                <span>
                  {t.property.streetWidth}: {property.streetWidth} m
                  {property.isCorner && property.streetWidth2 != null && ` × ${property.streetWidth2} m`}
                  {property.isCorner && ` (${t.property.corner})`}
                </span>
              </div>
            )}
            {property.nearestLandmark && (
              <div className="property-detail-stat property-detail-stat--wide">
                <MapPin className="shrink-0 text-gold-500" />
                <span>
                  {t.property.nearestLandmark}: {property.nearestLandmark}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <div
              ref={descRef}
              onClick={() => {
                if (canExpand) {
                  setIsExpanded((prev) => !prev);
                  if (isExpanded) {
                    descRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }
              }}
              className={`property-detail-description whitespace-pre-wrap break-words ${
                !isExpanded ? 'property-detail-description--clamped' : ''
              } ${canExpand ? 'cursor-pointer hover:text-white' : ''}`}
            >
              {description}
            </div>

            {canExpand && (
              <button
                type="button"
                onClick={() => {
                  setIsExpanded((prev) => !prev);
                  if (isExpanded) {
                    descRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 hover:text-gold-300 transition-all cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <span>{t.property.showLess}</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>{t.property.showMore}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="property-detail-map mt-10 sm:mt-12">
        <h2 className="font-display text-xl text-gold-400 sm:text-2xl">{t.property.location}</h2>
        <div className="mt-4">
          <ObfuscatedMap neighborhood={property.neighborhood} />
        </div>
      </section>

      {(profile?.role === 'ADMIN' || profile?.role === 'STAFF') && (
        <section className="mt-10 sm:mt-12 rounded-2xl border border-gold-500/30 bg-gold-950/40 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-gold-400 animate-pulse" />
              <div>
                <span className="text-sm font-bold text-gold-300">بەڕێوەبەرایەتی موڵک (Admin Panel)</span>
                <p className="text-xs text-royal-300 mt-0.5">دەتوانیت هەموو زانیاری و تایبەتمەندی و وێنەکانی ئەم موڵکە دەستکاری بکەیت.</p>
              </div>
            </div>
            <Link
              to={`/property/${property.code}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-royal-950 hover:bg-gold-400 transition shadow-lg w-full sm:w-auto shrink-0"
            >
              <Edit3 className="h-4 w-4" />
              <span>{t.submit.editProperty}</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
