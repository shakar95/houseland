import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Property } from '@/types';
import { labelEnum } from '@/lib/format';

const TABS = ['all', 'PENDING', 'APPROVED', 'SOLD', 'RENTED'] as const;

export function PropertiesPage() {
  const [tab, setTab] = useState<string>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [contractForm, setContractForm] = useState({
    propertyId: '',
    clientName: '',
    amount: 0,
    contractType: 'SALE',
    date: new Date().toISOString().slice(0, 10),
  });

  const load = () => {
    const q = tab === 'all' ? '?status=all' : `?status=${tab}`;
    api.get<Property[]>(`/api/properties${q}`).then(setProperties).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [tab]);

  const approve = async (id: string, status: string) => {
    await api.patch(`/api/properties/${id}`, { status });
    load();
  };

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/contracts', {
      ...contractForm,
      date: new Date(contractForm.date).toISOString(),
    });
    setContractForm({ ...contractForm, clientName: '', amount: 0 });
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-gold-400">Property Ledger</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t ? 'bg-gold-500 text-royal-950' : 'bg-royal-800 text-royal-200'
            }`}
          >
            {t === 'all' ? 'All' : labelEnum(t)}
          </button>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-royal-700 text-royal-400">
            <tr>
              <th className="py-2">Code</th>
              <th>Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id} className="border-b border-royal-800/50">
                <td className="py-3 text-gold-400">{p.code}</td>
                <td>{p.title}</td>
                <td>{labelEnum(p.status)}</td>
                <td className="space-x-2">
                  {p.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        className="text-green-400"
                        onClick={() => approve(p.id, 'APPROVED')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="text-red-400"
                        onClick={() => approve(p.id, 'REJECTED')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={createContract} className="card-luxury mt-10 space-y-4 p-4">
        <h2 className="text-lg text-gold-300">Generate Contract</h2>
        <select
          className="input-luxury"
          value={contractForm.propertyId}
          onChange={(e) => setContractForm({ ...contractForm, propertyId: e.target.value })}
          required
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.title}
            </option>
          ))}
        </select>
        <input
          className="input-luxury"
          placeholder="Client name"
          value={contractForm.clientName}
          onChange={(e) => setContractForm({ ...contractForm, clientName: e.target.value })}
          required
        />
        <input
          type="number"
          className="input-luxury"
          placeholder="Amount"
          value={contractForm.amount || ''}
          onChange={(e) => setContractForm({ ...contractForm, amount: Number(e.target.value) })}
          required
        />
        <select
          className="input-luxury"
          value={contractForm.contractType}
          onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}
        >
          <option value="SALE">Sale</option>
          <option value="RENT">Rent</option>
        </select>
        <input
          type="date"
          className="input-luxury"
          value={contractForm.date}
          onChange={(e) => setContractForm({ ...contractForm, date: e.target.value })}
        />
        <button type="submit" className="btn-gold">
          Create Contract
        </button>
      </form>
    </div>
  );
}
