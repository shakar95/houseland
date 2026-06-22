import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { signInWithGoogle } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { SULAYMANIYAH_NEIGHBORHOODS, type Neighborhood } from '@/lib/neighborhoods';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { PropertyImageUpload } from '@/components/PropertyImageUpload';
import { uploadPropertyImages } from '@/lib/uploadPropertyImages';

const propertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'] as const;
const transactionTypes = ['FOR_SALE', 'FOR_RENT', 'FOR_EXCHANGE'] as const;

const empty = {
  title: '',
  description: '',
  propertyType: 'HOUSE',
  transactionType: 'FOR_SALE',
  areaSqm: 0,
  dimensions: '',
  price: 0,
  currency: 'USD',
  floors: undefined as number | undefined,
  bedrooms: undefined as number | undefined,
  bathrooms: undefined as number | undefined,
  facing: '',
  latitude: 35.556,
  longitude: 45.432,
  neighborhood: SULAYMANIYAH_NEIGHBORHOODS[0] as Neighborhood,
  images: [] as string[],
  videoLink: '',
};

export function SubmitPropertyPage() {
  const { t, enumLabel } = useLanguage();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [imageError, setImageError] = useState('');

  if (loading) return <p className="py-20 text-center">{t.common.loading}</p>;

  if (!profile) {
    return (
      <div className="app-page py-16 text-center">
        <h1 className="font-display text-3xl text-gold-400">{t.submit.signInTitle}</h1>
        <p className="mt-4 text-royal-300">{t.submit.signInDesc}</p>
        <Link to="/login" className="btn-gold mt-6 inline-flex">
          {t.auth.signIn}
        </Link>
        <button type="button" onClick={() => signInWithGoogle()} className="btn-outline-gold mt-3 w-full max-w-xs">
          {t.submit.continueGoogle}
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFiles.length) {
      setImageError(t.submit.imageRequired);
      setMessageIsError(true);
      setMessage(t.submit.imageRequired);
      return;
    }

    setSubmitting(true);
    setUploadingImages(true);
    setMessage('');
    setMessageIsError(false);
    setImageError('');
    try {
      const images = await uploadPropertyImages(imageFiles);
      setUploadingImages(false);
      await api.post('/api/properties', {
        ...form,
        currency: 'USD',
        images,
        facing: form.facing || null,
        floors: form.floors ?? null,
        bedrooms: form.bedrooms ?? null,
        bathrooms: form.bathrooms ?? null,
        dimensions: form.dimensions || null,
        videoLink: form.videoLink || null,
      });
      setMessage(t.submit.success);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setUploadingImages(false);
      setMessageIsError(true);
      const code = err instanceof Error ? err.message : '';
      if (code === 'STORAGE_NOT_CONFIGURED') {
        setMessage(t.submit.storageNotConfigured);
      } else if (code === 'STORAGE_BUCKET_MISSING') {
        setMessage(t.submit.storageBucketMissing);
      } else if (code === 'NOT_AUTHENTICATED') {
        setMessage(t.submit.signInTitle);
      } else {
        setMessage(err instanceof Error ? err.message : t.submit.failed);
      }
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  return (
    <div className="app-page pb-6">
      <h1 className="text-xl font-bold text-gold-400">{t.nav.submit}</h1>
      <p className="mt-2 text-royal-300">{t.submit.intro}</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <input
          className="input-luxury"
          placeholder={t.submit.titlePlaceholder}
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="input-luxury min-h-[120px]"
          placeholder={t.submit.descriptionPlaceholder}
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="filter-label">{t.submit.propertyTypeLabel}</label>
            <select
              className="input-luxury mt-1"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
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
        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="number"
            className="input-luxury"
            placeholder={t.submit.areaPlaceholder}
            required
            value={form.areaSqm || ''}
            onChange={(e) => setForm({ ...form, areaSqm: Number(e.target.value) })}
          />
          <input
            type="number"
            className="input-luxury"
            placeholder={t.submit.pricePlaceholder}
            required
            value={form.price || ''}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </div>
        <PropertyImageUpload
          files={imageFiles}
          onChange={(next) => {
            setImageFiles(next);
            setImageError('');
          }}
          disabled={submitting}
          error={imageError}
        />
        <input
          className="input-luxury"
          placeholder={t.submit.videoPlaceholder}
          value={form.videoLink}
          onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
        />
        {message && (
          <p className={messageIsError ? 'text-red-300' : 'text-gold-300'}>{message}</p>
        )}
        <button type="submit" disabled={submitting} className="btn-gold w-full">
          {uploadingImages
            ? t.submit.uploadingImages
            : submitting
              ? t.submit.submitting
              : t.submit.submitButton}
        </button>
      </form>
    </div>
  );
}
