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
  UserCheck,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PropertyImageGallery } from '@/components/PropertyImageGallery';
import { ObfuscatedMap } from '@/components/maps/ObfuscatedMap';
import type { AgencySettings, Property } from '@/types';
import { formatPrice, formatCountLabel, pickCountLabel, formatNumber } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { useNeighborhoods, getNeighborhoodLabelByName } from '@/hooks/useNeighborhoods';
import { OwnerContactPicker, type OwnerContactData } from '@/components/OwnerContactPicker';
import { getOwnerContact, saveOwnerContact } from '@/lib/ownerContactService';

export function PropertyDetailPage() {
  const { t, lang, enumLabel, propertyDescription } = useLanguage();
  const { neighborhoods } = useNeighborhoods();
  const { profile } = useAuth();
  const { code } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [ownerContact, setOwnerContact] = useState<OwnerContactData | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerContactData | null>(null);
  const [savingOwner, setSavingOwner] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsExpanded(false);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    api.get<Property>(`/api/properties/${code}`, { auth: false, cacheMs: 30_000 }).then(setProperty).catch(() => {});
    api.get<AgencySettings>('/api/agency').then(setAgency).catch(() => {});

    if (profile?.role === 'ADMIN' || profile?.role === 'STAFF') {
      getOwnerContact(code).then(setOwnerContact).catch(() => {});
    }
  }, [code, profile?.role]);

  const track = (event: 'phone' | 'whatsapp') => {
    if (!property) return;
    api.post(`/api/properties/${property.id}/analytics`, { event }).catch(() => {});
  };

  const title = property ? `${enumLabel(property.propertyType)} — ${getNeighborhoodLabelByName(property.neighborhood, neighborhoods, lang)}` : '';
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
            imageCount={property.imageCount}
            alt={title}
          />
        </section>

        <section className="property-detail-info">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
              #{property.code}
            </span>
            <span className="inline-flex items-center rounded-xl border border-royal-800 bg-royal-900/80 px-2.5 py-1 text-xs font-semibold text-royal-300">
              {enumLabel(property.transactionType)}
            </span>
          </div>

          <h1 className="property-detail-title mt-2.5">{title}</h1>
          <p className="property-detail-price font-display text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500">
            {formatPrice(property.price, property.currency, lang)}
          </p>
          <p className="property-detail-meta text-royal-300">
            {enumLabel(property.transactionType)} · {enumLabel(property.propertyType)} · {getNeighborhoodLabelByName(property.neighborhood, neighborhoods, lang)}
          </p>

          <div className="property-detail-stats">
            <div className="property-detail-stat">
              <div className="property-detail-stat-icon">
                <Maximize className="h-4 w-4" />
              </div>
              <span>{formatCountLabel(t.property.areaSqm, property.areaSqm, lang)}</span>
            </div>
            {property.bedrooms != null && (
              <div className="property-detail-stat">
                <div className="property-detail-stat-icon">
                  <Bed className="h-4 w-4" />
                </div>
                <span>{pickCountLabel(property.bedrooms, t.property.bedroom, t.property.bedrooms, lang)}</span>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="property-detail-stat">
                <div className="property-detail-stat-icon">
                  <Bath className="h-4 w-4" />
                </div>
                <span>{pickCountLabel(property.bathrooms, t.property.bathroom, t.property.bathrooms, lang)}</span>
              </div>
            )}
            {property.floors != null && (
              <div className="property-detail-stat">
                <div className="property-detail-stat-icon">
                  <Layers className="h-4 w-4" />
                </div>
                <span>{formatCountLabel(t.property.floors, property.floors, lang)}</span>
              </div>
            )}
            {property.facing && (
              <div className="property-detail-stat property-detail-stat--wide">
                <div className="property-detail-stat-icon">
                  <Compass className="h-4 w-4" />
                </div>
                <span>
                  {t.property.facing}: {enumLabel(property.facing)}
                </span>
              </div>
            )}
            {property.frontageMeters != null && (
              <div className="property-detail-stat">
                <div className="property-detail-stat-icon">
                  <Ruler className="h-4 w-4" />
                </div>
                <span>
                  {t.property.frontage}: {formatNumber(property.frontageMeters, lang)} m
                </span>
              </div>
            )}
            {property.streetWidth != null && (
              <div className="property-detail-stat">
                <div className="property-detail-stat-icon">
                  <Route className="h-4 w-4" />
                </div>
                <span>
                  {t.property.streetWidth}: {formatNumber(property.streetWidth, lang)} m
                  {property.isCorner && property.streetWidth2 != null &&
                    ` × ${formatNumber(property.streetWidth2, lang)} m`}
                  {property.isCorner && ` (${t.property.corner})`}
                </span>
              </div>
            )}
            {property.nearestLandmark && (
              <div className="property-detail-stat property-detail-stat--wide">
                <div className="property-detail-stat-icon">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>
                  {t.property.nearestLandmark}: {property.nearestLandmark}
                </span>
              </div>
            )}
          </div>

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
              className="btn-whatsapp property-detail-btn"
            >
              <MessageCircle className="h-4 w-4" /> {t.property.whatsapp}
            </a>
          </div>
          <p className="mt-2 text-xs text-royal-500">{t.property.privacyNote}</p>

          <div className="relative mt-6 rounded-2xl border border-royal-800/80 bg-royal-900/35 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
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
              className={`text-sm leading-relaxed text-royal-200 sm:text-base whitespace-pre-wrap break-words transition-all duration-300 ${
                !isExpanded ? 'max-h-[14rem] overflow-hidden relative' : ''
              } ${canExpand ? 'cursor-pointer hover:text-white' : ''}`}
            >
              {description}
              
              {!isExpanded && canExpand && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-royal-950 via-royal-950/80 to-transparent pointer-events-none" />
              )}
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
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3.5 py-2 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 hover:text-gold-300 active:scale-95 transition-all cursor-pointer"
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

      <section className="property-detail-map mt-8 sm:mt-10 rounded-2xl border border-royal-800/80 bg-royal-900/35 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/20 bg-gold-500/10 text-gold-400">
              <MapPin className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg font-bold text-gold-300 sm:text-xl">{t.property.location}</h2>
          </div>
          <span className="text-xs font-medium text-royal-400">
            {getNeighborhoodLabelByName(property.neighborhood, neighborhoods, lang)}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-royal-800/60 shadow-inner">
          <ObfuscatedMap neighborhood={property.neighborhood} />
        </div>
      </section>

      {(profile?.role === 'ADMIN' || profile?.role === 'STAFF') && (
        <section className="mt-10 sm:mt-12 rounded-3xl border border-gold-500/40 bg-gradient-to-br from-royal-950 via-gold-950/20 to-royal-900/60 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gold-500/20 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-gold-400 animate-pulse" />
              <div>
                <span className="text-base font-bold text-gold-300">بەڕێوەبەرایەتی موڵک (Admin Panel)</span>
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

          {/* Dedicated Owner Contact Card - Strictly Admin & Staff Only */}
          <div className="rounded-2xl border border-gold-500/30 bg-royal-950/80 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/20 text-gold-300 border border-gold-500/30 font-bold">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">زانیاری خاوەنی موڵک (Owner Contact)</h3>
                  <span className="text-[11px] text-royal-400">تەنها بۆ ئەدمین و ستافی نووسینگە ئاشکرایە</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>نهێنی · تەنها ئەدمین</span>
              </span>
            </div>

            {ownerContact ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-royal-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-royal-400">ناوی تەواو:</span>
                    <span className="text-sm font-bold text-white">{ownerContact.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-royal-400">ژمارەی مۆبایل:</span>
                    <span className="text-xs font-mono font-bold text-gold-300 dir-ltr">{ownerContact.phone}</span>
                  </div>
                  {ownerContact.notes && (
                    <p className="text-[11px] text-royal-400 mt-1 italic">"{ownerContact.notes}"</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={`tel:${ownerContact.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-royal-700 bg-royal-900 px-3.5 py-2 text-xs font-semibold text-royal-100 hover:border-gold-500 hover:text-gold-300 transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-gold-400" />
                    <span>پەیوەندی</span>
                  </a>
                  <a
                    href={`https://wa.me/${ownerContact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`سڵاو بەڕێز ${ownerContact.customerName}، لە ئەجەنسی Houseland دەربارەی موڵکەکەت (کۆدی #${property.code}) پەیوەندیت پێوە دەکەین.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:brightness-105 transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>واتسئاپ</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOwner(ownerContact);
                      setShowOwnerModal(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-royal-700 bg-royal-800/60 px-2.5 py-2 text-xs font-semibold text-royal-300 hover:text-white transition"
                    title="دەستکاریکردن یان گۆڕینی خاوەن موڵک"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>گۆڕین</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-royal-800/80">
                <p className="text-xs text-royal-400">هیچ خاوەن موڵکێک بۆ ئەم موڵکە ئەتاچ نەکراوە.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOwner(null);
                      setShowOwnerModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-royal-950 hover:bg-gold-400 transition shadow"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>ئەتاچ کردنی خاوەن موڵک</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Admin Attach / Edit Owner Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-royal-700 bg-gradient-to-b from-royal-900 to-royal-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-base font-bold text-white">
                  ئەتاچ کردنی خاوەنی موڵکی #{property.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOwnerModal(false)}
                className="text-royal-400 hover:text-white text-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <OwnerContactPicker
              value={editingOwner}
              onChange={setEditingOwner}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-royal-800">
              <button
                type="button"
                onClick={() => setShowOwnerModal(false)}
                className="rounded-xl border border-royal-700 px-4 py-2 text-xs font-semibold text-royal-300 hover:text-white"
              >
                داخستن
              </button>
              <button
                type="button"
                disabled={savingOwner}
                onClick={async () => {
                  setSavingOwner(true);
                  try {
                    const saved = await saveOwnerContact(property.code, editingOwner);
                    setOwnerContact(saved);
                    setShowOwnerModal(false);
                  } finally {
                    setSavingOwner(false);
                  }
                }}
                className="btn-gold text-xs px-5 py-2 font-bold disabled:opacity-50"
              >
                {savingOwner ? 'تۆمارکردن...' : 'پاشەکەوتکردن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
