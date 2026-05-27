import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AgencySettings } from '@/types';

export function SettingsPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState<Partial<AgencySettings>>({});

  useEffect(() => {
    api.get<AgencySettings>('/api/agency').then(setForm).catch(() => {});
  }, []);

  if (profile?.role !== 'ADMIN') {
    return <p className="text-royal-400">Admin access required.</p>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put('/api/agency', form);
    alert('Settings saved.');
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-gold-400">Agency Settings</h1>
      <form onSubmit={save} className="card-luxury mt-6 max-w-xl space-y-4 p-4">
        <input
          className="input-luxury"
          placeholder="Agency name"
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Logo URL"
          value={form.logoUrl ?? ''}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Primary phone"
          value={form.phonePrimary ?? ''}
          onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Secondary phone"
          value={form.phoneSecondary ?? ''}
          onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="WhatsApp"
          value={form.whatsapp ?? ''}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
        />
        <textarea
          className="input-luxury"
          placeholder="Office address"
          value={form.address ?? ''}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <button type="submit" className="btn-gold">
          Save Settings
        </button>
      </form>
    </div>
  );
}
