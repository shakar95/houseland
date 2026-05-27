import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Staff } from '@/types';

export function StaffPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState({
    name: '',
    position: '',
    phoneNumber: '',
    bio: '',
    photoUrl: '',
  });

  const load = () => api.get<Staff[]>('/api/staff').then(setStaff).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  if (profile?.role !== 'ADMIN') {
    return <p className="text-royal-400">Admin access required.</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/staff', form);
    setForm({ name: '', position: '', phoneNumber: '', bio: '', photoUrl: '' });
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/api/staff/${id}`);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-gold-400">Staff</h1>
      <form onSubmit={submit} className="card-luxury mt-6 grid gap-4 p-4 sm:grid-cols-2">
        <input
          className="input-luxury"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Position"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Phone"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Photo URL"
          value={form.photoUrl}
          onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
        />
        <textarea
          className="input-luxury sm:col-span-2"
          placeholder="Bio"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
        <button type="submit" className="btn-gold sm:col-span-2">
          Add Staff
        </button>
      </form>
      <ul className="mt-8 space-y-4">
        {staff.map((s) => (
          <li key={s.id} className="card-luxury flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gold-400">{s.position}</p>
            </div>
            <button type="button" onClick={() => remove(s.id)} className="text-sm text-red-400">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
