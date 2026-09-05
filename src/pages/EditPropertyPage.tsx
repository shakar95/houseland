import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Trash2, X, Save, AlertTriangle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { SULAYMANIYAH_NEIGHBORHOODS, type Neighborhood } from '@/lib/neighborhoods';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { PropertyImageUpload } from '@/components/PropertyImageUpload';
import { uploadPropertyImages } from '@/lib/uploadPropertyImages';
import type { Property } from '@/types';

const propertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL', 'FARM'] as const;
const transactionTypes = ['FOR_SALE', 'FOR_RENT', 'FOR_EXCHANGE'] as const;
const facingDirections = ['EAST', 'WEST', 'NORTH', 'SOUTH'] as const;
const residentialTypes = new Set(['HOUSE', 'APARTMENT', 'VILLA']);
const statusOptions = ['APPROVED', 'PENDING', 'REJECTED', 'SOLD', 'RENTED'] as const;

export function EditPropertyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { t, enumLabel, rtl } = useLanguage();
  const { profile, loading: authLoading } = useAuth();

  const [loadingProperty, setLoadingProperty] = useState(true);
  const [propertyId, setPropertyId] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const [form, setForm] = useState({
    description: '',
    propertyType: 'HOUSE' as string,
    transactionType: 'FOR_SALE' as string,
    areaSqm: 0,
    price: 0,
    currency: 'USD' as 'USD' | 'IQD',
    frontageMeters: undefined as number | undefined,
    streetWidth: undefined as number | undefined,
    streetWidth2: undefined as number | undefined,
    isCorner: false,
    nearestLandmark: '',
    dimensions: '',
    floors: undefined as number | undefined,
    bedrooms: undefined as number | undefined,
    facing: '',
    neighborhood: SULAYMANIYAH_NEIGHBORHOODS[0] as Neighborhood,
    latitude: 35.556,
    longitude: 45.432,
    videoLink: '',
    status: 'APPROVED' as string,
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'STAFF';

  useEffect(() => {
    if (!code) return;
    setLoadingProperty(true);
    api
      .get<Property>(`/api/properties/${code}`, { auth: true })
      .then((prop) => {
        setPropertyId(prop.id);
        setExistingImages(prop.images || []);
        setForm({
          description: prop.description || '',
          propertyType: prop.propertyType,
          transactionType: prop.transactionType,
          areaSqm: prop.areaSqm || 0,
          price: prop.price || 0,
          currency: (prop.currency as any) || 'USD',
          frontageMeters: prop.frontageMeters ?? undefined,
          streetWidth: prop.streetWidth ?? undefined,
          streetWidth2: prop.streetWidth2 ?? undefined,
          isCorner: Boolean(prop.isCorner),
          nearestLandmark: prop.nearestLandmark || '',
          dimensions: prop.dimensions || '',
          floors: prop.floors ?? undefined,
          bedrooms: prop.bedrooms ?? undefined,
          facing: prop.facing || '',
          neighborhood: (prop.neighborhood as Neighborhood) || SULAYMANIYAH_NEIGHBORHOODS[0],
          latitude: prop.latitude || 35.556,
          longitude: prop.longitude || 45.432,
          videoLink: prop.videoLink || '',
          status: prop.status,
        });
      })
      .catch((err) => {
        console.error('Failed to load property:', err);
        setMessage(t.submit.propertyNotFound);
        setMessageIsError(true);
      })
      .finally(() => {
        setLoadingProperty(false);
      });
  }, [code]);

  if (authLoading || loadingProperty) {
    return (
      <div className="app-page py-20 text-center">
        <p className="text-royal-400">{t.common.loading}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="app-page py-20 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h1 className="mt-4 text-xl font-bold text-red-400">ڕێگەپێدراو نیت!</h1>
        <p className="mt-2 text-royal-300">تەنها بەڕێوەبەری سیستم (Admin) دەتوانێت موڵکەکان دەستکاری بکات.</p>
        <Link to="/" className="btn-gold mt-6 inline-flex">
          گەڕانەوە بۆ پەڕەی سەرەکی
        </Link>
      </div>
    );
  }

  const showFloorsField = residentialTypes.has(form.propertyType);
  const showRoomFields = residentialTypes.has(form.propertyType);
  const isApartment = form.propertyType === 'APARTMENT';
  const floorsLabel = isApartment ? t.submit.floorLevelLabel : t.submit.floorsCountLabel;
  const floorsPlaceholder = isApartment ? t.submit.floorLevelPlaceholder : t.submit.floorsCountPlaceholder;
  const BackIcon = rtl ? ArrowRight : ArrowLeft;

  const removeExistingImage = (idx: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingImages.length === 0 && newImageFiles.length === 0) {
      setMessageIsError(true);
      setMessage(t.submit.imageRequired);
      return;
    }

    setSaving(true);
    setMessage('');
    setMessageIsError(false);

    try {
      let finalImages = [...existingImages];
      if (newImageFiles.length > 0) {
        const uploadedUrls = await uploadPropertyImages(newImageFiles);
        finalImages = [...finalImages, ...uploadedUrls];
      }

      const payload = {
        title: `${enumLabel(form.propertyType)} — ${form.neighborhood}`,
        description: form.description,
        propertyType: form.propertyType,
        transactionType: form.transactionType,
        areaSqm: form.areaSqm,
        price: form.price,
        currency: form.currency,
        neighborhood: form.neighborhood,
        frontageMeters: form.frontageMeters ?? null,
        streetWidth: form.streetWidth ?? null,
        streetWidth2: form.isCorner ? (form.streetWidth2 ?? null) : null,
        isCorner: form.isCorner,
        nearestLandmark: form.nearestLandmark?.trim() || null,
        dimensions: form.dimensions || null,
        floors: form.floors ?? null,
        bedrooms: form.bedrooms ?? null,
        bathrooms: null,
        facing: form.facing || null,
        latitude: form.latitude,
        longitude: form.longitude,
        videoLink: form.videoLink || null,
        status: form.status,
        images: finalImages,
      };

      await api.patch(`/api/properties/${propertyId}`, payload);
      setMessage(t.submit.editSuccess);
      setTimeout(() => {
        navigate(`/property/${code}`);
      }, 1200);
    } catch (err) {
      console.error('Save failed:', err);
      setMessageIsError(true);
      setMessage(err instanceof Error ? err.message : t.submit.failed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t.submit.deleteConfirm)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/properties/${propertyId}`);
      alert('موڵکەکە بە سەرکەوتوویی سڕایەوە.');
      navigate('/dashboard/properties');
    } catch (err) {
      alert('سڕینەوەی موڵکەکە سەرکەوتوو نەبوو.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="app-page pb-12">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-royal-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/property/${code}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-royal-700 bg-royal-900/60 text-gold-400 hover:bg-royal-800 transition"
          >
            <BackIcon className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-gold-500">کۆدی موڵک: {code}</span>
            <h1 className="text-xl font-bold text-royal-100">{t.submit.editTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/property/${code}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-royal-700 bg-royal-800/50 px-3 py-1.5 text-xs text-royal-300 hover:text-gold-300 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>بینین لە پەڕە</span>
          </Link>
          {profile?.role === 'ADMIN' && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.submit.deleteProperty}</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        {/* Status & Featured selector for Admin */}
        <div className="rounded-xl border border-gold-500/30 bg-gold-950/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="filter-label text-gold-400">{t.submit.statusLabel}</label>
              <select
                className="input-luxury mt-1 border-gold-500/40"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {enumLabel(st)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="filter-label text-gold-400">جۆری دراو</label>
              <select
                className="input-luxury mt-1 border-gold-500/40"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
              >
                <option value="USD">دۆلار ($ USD)</option>
                <option value="IQD">دیناری عێراقی (IQD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="filter-label">وەسفی موڵک</label>
          <textarea
            className="input-luxury mt-1 min-h-[140px]"
            placeholder={t.submit.descriptionPlaceholder}
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Property Type & Transaction Type */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="filter-label">{t.submit.propertyTypeLabel}</label>
            <select
              className="input-luxury mt-1"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value, floors: undefined })}
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {enumLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="filter-label">{t.submit.transactionTypeLabel}</label>
            <select
              className="input-luxury mt-1"
              value={form.transactionType}
              onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
            >
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {enumLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Area & Price */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="filter-label">ڕووبەر (مەتر دووجا m²)</label>
            <input
              type="number"
              className="input-luxury mt-1"
              placeholder={t.submit.areaPlaceholder}
              required
              value={form.areaSqm || ''}
              onChange={(e) => setForm({ ...form, areaSqm: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="filter-label">نرخ</label>
            <input
              type="number"
              className="input-luxury mt-1"
              placeholder={t.submit.pricePlaceholder}
              required
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* پێش (Frontage) و کۆڵان (Street Width) و ڕوکن (Corner) */}
        <div className="rounded-xl border border-royal-800/80 bg-royal-950/40 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="filter-label">{t.submit.frontageLabel}</label>
              <input
                type="number"
                min={0}
                step="any"
                className="input-luxury mt-1"
                placeholder={t.submit.frontagePlaceholder}
                value={form.frontageMeters ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    frontageMeters: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="filter-label">
                  {form.isCorner ? t.submit.streetWidth1Label : t.submit.streetWidthLabel}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gold-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isCorner}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isCorner: e.target.checked,
                        streetWidth2: e.target.checked ? form.streetWidth2 : undefined,
                      })
                    }
                    className="h-4 w-4 rounded border-royal-700 bg-royal-900 text-gold-500 focus:ring-gold-500 focus:ring-offset-royal-950 cursor-pointer"
                  />
                  <span>{t.submit.isCornerLabel}</span>
                </label>
              </div>
              <input
                type="number"
                min={0}
                step="any"
                className="input-luxury mt-1"
                placeholder={form.isCorner ? t.submit.streetWidth1Label : t.submit.streetWidthPlaceholder}
                value={form.streetWidth ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    streetWidth: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          {form.isCorner && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div></div>
              <div>
                <label className="filter-label">{t.submit.streetWidth2Label}</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="input-luxury mt-1"
                  placeholder={t.submit.streetWidth2Label}
                  value={form.streetWidth2 ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      streetWidth2: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Floors & Bedrooms & Facing */}
        {showFloorsField && (
          <div>
            <label className="filter-label">{floorsLabel}</label>
            <input
              type="number"
              min={1}
              className="input-luxury mt-1"
              placeholder={floorsPlaceholder}
              value={form.floors ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  floors: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        )}

        {showRoomFields && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="filter-label">{t.submit.bedroomsLabel}</label>
              <input
                type="number"
                min={0}
                className="input-luxury mt-1"
                placeholder={t.submit.bedroomsPlaceholder}
                value={form.bedrooms ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bedrooms: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <label className="filter-label">{t.submit.facingLabel}</label>
              <select
                className="input-luxury mt-1"
                value={form.facing}
                onChange={(e) => setForm({ ...form, facing: e.target.value })}
              >
                <option value="">{t.submit.facingPlaceholder}</option>
                {facingDirections.map((dir) => (
                  <option key={dir} value={dir}>
                    {enumLabel(dir)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Neighborhood & Landmark */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="filter-label">{t.submit.neighborhoodLabel}</label>
            <select
              className="input-luxury mt-1"
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value as Neighborhood })}
            >
              {SULAYMANIYAH_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="filter-label">{t.submit.nearestLandmarkLabel}</label>
            <input
              type="text"
              className="input-luxury mt-1"
              placeholder={t.submit.nearestLandmarkPlaceholder}
              value={form.nearestLandmark}
              onChange={(e) => setForm({ ...form, nearestLandmark: e.target.value })}
            />
          </div>
        </div>

        {/* Map Location */}
        <div>
          <label className="filter-label mb-2 block">دیاریکردنی شوێن لەسەر نەخشە</label>
          <LocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
          />
        </div>

        {/* Existing Images Management */}
        {existingImages.length > 0 && (
          <div className="rounded-xl border border-royal-800/80 bg-royal-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="filter-label text-gold-400">{t.submit.existingImages}</label>
              <span className="text-xs text-royal-400">{existingImages.length} وێنە</span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {existingImages.map((imgUrl, index) => (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-royal-800/80 bg-royal-900/50"
                >
                  <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-1.5 end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/80 text-white hover:bg-red-500 transition shadow"
                    title="سڕینەوەی ئەم وێنەیە"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload New Additional Images */}
        <div className="rounded-xl border border-royal-800/80 bg-royal-950/40 p-4 space-y-2">
          <label className="filter-label block text-gold-400">زیادکردنی وێنەی نوێ</label>
          <PropertyImageUpload
            files={newImageFiles}
            onChange={(files) => setNewImageFiles(files)}
            disabled={saving}
          />
        </div>

        {/* Video Link */}
        <div>
          <label className="filter-label">بەستەری ڤیدیۆ (Reels, TikTok, YouTube, Facebook)</label>
          <input
            className="input-luxury mt-1"
            placeholder={t.submit.videoPlaceholder}
            value={form.videoLink}
            onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
            onBlur={async (e) => {
              const val = e.target.value.trim();
              if (val && (val.includes('facebook.com/share/') || val.includes('fb.watch/'))) {
                try {
                  const res = await fetch(`/api/resolve-video-url?url=${encodeURIComponent(val)}`);
                  const data = await res.json();
                  if (data?.resolvedUrl) {
                    setForm((prev) => ({ ...prev, videoLink: data.resolvedUrl }));
                  }
                } catch {}
              }
            }}
          />
        </div>

        {message && (
          <p className={`text-sm font-medium ${messageIsError ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        {/* Submit button */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold flex-1 flex items-center justify-center gap-2 py-3 text-base"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? t.submit.saving : t.submit.saveChanges}</span>
          </button>
          <Link
            to={`/property/${code}`}
            className="btn-outline-gold px-6 flex items-center justify-center"
          >
            پاشگەزبوونەوە
          </Link>
        </div>
      </form>
    </div>
  );
}
