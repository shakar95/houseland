import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import type { Staff } from '@/types';

export function AboutPage() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    api.get<Staff[]>('/api/staff').then(setStaff).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl text-gold-400">{t.about.title}</h1>
      <p className="mt-4 max-w-3xl text-lg text-royal-200">{t.about.intro}</p>
      <h2 className="mt-12 font-display text-2xl text-gold-400">{t.about.team}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <div key={s.id} className="card-luxury p-6 text-center">
            {s.photoUrl && (
              <img src={s.photoUrl} alt={s.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
            )}
            <h3 className="mt-4 font-display text-xl">{s.name}</h3>
            <p className="text-gold-400">{s.position}</p>
            <p className="mt-2 text-sm text-royal-300">{s.bio}</p>
            <a href={`tel:${s.phoneNumber}`} className="mt-3 inline-block text-sm text-gold-300">
              {s.phoneNumber}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
