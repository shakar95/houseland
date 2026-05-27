import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { signInWithGoogle } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { SULAYMANIYAH_NEIGHBORHOODS, type Neighborhood } from '@/lib/neighborhoods';
import { LocationPicker } from '@/components/maps/LocationPicker';

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
  images: [''],
  videoLink: '',
};

export function SubmitPropertyPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  if (loading) return <p className="py-20 text-center">Loading...</p>;

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl text-gold-400">Sign in to Submit</h1>
        <p className="mt-4 text-royal-300">Use Google to register and submit your property for review.</p>
        <button type="button" onClick={() => signInWithGoogle()} className="btn-gold mt-8">
          Continue with Google
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const images = form.images.filter(Boolean);
      await api.post('/api/properties', {
        ...form,
        images,
        facing: form.facing || null,
        floors: form.floors ?? null,
        bedrooms: form.bedrooms ?? null,
        bathrooms: form.bathrooms ?? null,
        dimensions: form.dimensions || null,
        videoLink: form.videoLink || null,
      });
      setMessage('Submitted! Your listing is pending admin approval.');
      setTimeout(() => navigate('/listings'), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-gold-400">Submit a Property</h1>
      <p className="mt-2 text-royal-300">
        Listings stay private until approved. Contact details will show agency numbers only.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <input
          className="input-luxury"
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="input-luxury min-h-[120px]"
          placeholder="Description"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <select
            className="input-luxury"
            value={form.propertyType}
            onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
          >
            {['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="input-luxury"
            value={form.transactionType}
            onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
          >
            <option value="FOR_SALE">For Sale</option>
            <option value="FOR_RENT">For Rent</option>
          </select>
        </div>
        <select
          className="input-luxury"
          value={form.neighborhood}
          onChange={(e) => setForm({ ...form, neighborhood: e.target.value as Neighborhood })}
        >
          {SULAYMANIYAH_NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <input
            type="number"
            className="input-luxury"
            placeholder="Area (m²)"
            required
            value={form.areaSqm || ''}
            onChange={(e) => setForm({ ...form, areaSqm: Number(e.target.value) })}
          />
          <input
            type="number"
            className="input-luxury"
            placeholder="Price"
            required
            value={form.price || ''}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
          <select
            className="input-luxury"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="IQD">IQD</option>
          </select>
        </div>
        <input
          className="input-luxury"
          placeholder="Image URL"
          value={form.images[0]}
          onChange={(e) => setForm({ ...form, images: [e.target.value] })}
        />
        <input
          className="input-luxury"
          placeholder="Video link (YouTube, TikTok, Facebook, Instagram)"
          value={form.videoLink}
          onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
        />
        {message && <p className="text-gold-300">{message}</p>}
        <button type="submit" disabled={submitting} className="btn-gold w-full">
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
}
