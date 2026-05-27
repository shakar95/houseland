import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CrmEntry, Property } from '@/types';
import { formatPrice, labelEnum } from '@/lib/format';

export function CrmPage() {
  const [entries, setEntries] = useState<CrmEntry[]>([]);
  const [inventory, setInventory] = useState<Property[]>([]);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    notes: '',
    budget: 0,
    budgetCurrency: 'USD',
    status: 'LEAD',
    propertyInterests: [] as string[],
  });

  const load = () => api.get<CrmEntry[]>('/api/crm').then(setEntries).catch(() => {});

  useEffect(() => {
    load();
    api.get<Property[]>('/api/properties?status=APPROVED').then(setInventory).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/crm', form);
    setForm({
      customerName: '',
      phone: '',
      email: '',
      notes: '',
      budget: 0,
      budgetCurrency: 'USD',
      status: 'LEAD',
      propertyInterests: [],
    });
    load();
  };

  const matches = (entry: CrmEntry) => {
    if (!entry.budget) return inventory.slice(0, 3);
    return inventory.filter((p) => p.price <= (entry.budget ?? Infinity) * 1.15).slice(0, 3);
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-gold-400">CRM</h1>
      <form onSubmit={submit} className="card-luxury mt-6 grid gap-4 p-4 sm:grid-cols-2">
        <input
          className="input-luxury"
          placeholder="Customer name"
          required
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Phone"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="input-luxury"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="number"
          className="input-luxury"
          placeholder="Budget"
          value={form.budget || ''}
          onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
        />
        <textarea
          className="input-luxury sm:col-span-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button type="submit" className="btn-gold sm:col-span-2">
          Add Lead
        </button>
      </form>

      <div className="mt-8 space-y-6">
        {entries.map((entry) => (
          <div key={entry.id} className="card-luxury p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="text-lg text-gold-300">{entry.customerName}</h3>
              <span className="rounded bg-royal-800 px-2 py-0.5 text-xs">{labelEnum(entry.status)}</span>
            </div>
            <p className="text-sm text-royal-300">
              {entry.phone} {entry.email && `· ${entry.email}`}
            </p>
            {entry.budget && (
              <p className="text-sm text-gold-400">
                Budget: {formatPrice(entry.budget, entry.budgetCurrency ?? 'USD')}
              </p>
            )}
            {entry.notes && <p className="mt-2 text-sm text-royal-400">{entry.notes}</p>}
            <div className="mt-3">
              <p className="text-xs text-royal-500">Inventory match</p>
              <ul className="mt-1 text-sm">
                {matches(entry).map((p) => (
                  <li key={p.id}>
                    {p.code} — {formatPrice(p.price, p.currency)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
