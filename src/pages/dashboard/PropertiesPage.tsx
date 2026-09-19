import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Property } from '@/types';
import { labelEnum } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const TABS = ['all', 'PENDING', 'APPROVED', 'SOLD', 'RENTED'] as const;
const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=120';
const PAGE_SIZE = 50;
const TAB_CACHE_MS = 60_000;

type ListMeta = { totalCount: number; totalPages: number; currentPage: number };
type ListPayload = { data: Property[]; meta: ListMeta };

function listPath(tab: string, page: number) {
  const status = tab === 'all' ? 'all' : tab;
  return `/api/properties?status=${status}&page=${page}&limit=${PAGE_SIZE}`;
}

export function PropertiesPage() {
  const { formatNum, t } = useLanguage();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const [tab, setTab] = useState<string>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ListMeta>({ totalCount: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, { payload: ListPayload; at: number }>());
  const [contractForm, setContractForm] = useState({
    propertyId: '',
    clientName: '',
    amount: 0,
    contractType: 'SALE',
    date: new Date().toISOString().slice(0, 10),
  });

  const applyPayload = useCallback((payload: ListPayload) => {
    setProperties(payload.data);
    setMeta(payload.meta);
  }, []);

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const changeTab = (next: string) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
  };

  useEffect(() => {
    const key = `${tab}:${page}`;
    const cached = cacheRef.current.get(key);
    const fresh = cached && Date.now() - cached.at < TAB_CACHE_MS;

    if (fresh) {
      applyPayload(cached.payload);
      setLoading(false);
      return;
    }

    // Instant tab feel: show stale cache for this tab if any, else keep current rows dimmed
    if (cached) {
      applyPayload(cached.payload);
    }

    const controller = new AbortController();
    setLoading(true);

    api
      .get<ListPayload>(listPath(tab, page), { signal: controller.signal })
      .then((res) => {
        const payload = { data: res.data, meta: res.meta };
        cacheRef.current.set(key, { payload, at: Date.now() });
        applyPayload(payload);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof Error && err.name === 'AbortError') return;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [tab, page, applyPayload]);

  const reload = useCallback(async () => {
    invalidateCache();
    setLoading(true);
    try {
      const res = await api.get<ListPayload>(listPath(tab, page));
      const payload = { data: res.data, meta: res.meta };
      cacheRef.current.set(`${tab}:${page}`, { payload, at: Date.now() });
      applyPayload(payload);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tab, page, applyPayload, invalidateCache]);

  const approve = async (id: string, status: string) => {
    await api.patch(`/api/properties/${id}`, { status });
    await reload();
  };

  const handleDelete = async (p: Property) => {
    if (!window.confirm(t.submit.deleteConfirm)) return;
    setDeletingId(p.id);
    try {
      await api.delete(`/api/properties/${p.id}`);
      invalidateCache();
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
      setMeta((m) => ({ ...m, totalCount: Math.max(0, m.totalCount - 1) }));
    } catch {
      alert(t.submit.failed);
    } finally {
      setDeletingId(null);
    }
  };

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/contracts', {
      ...contractForm,
      date: new Date(contractForm.date).toISOString(),
    });
    setContractForm({ ...contractForm, clientName: '', amount: 0 });
    await reload();
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-gold-400">Property Ledger</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tTab) => (
          <button
            key={tTab}
            type="button"
            onClick={() => changeTab(tTab)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              tab === tTab ? 'bg-gold-500 text-royal-950' : 'bg-royal-800 text-royal-200 hover:bg-royal-700'
            }`}
          >
            {tTab === 'all' ? 'All' : labelEnum(tTab)}
          </button>
        ))}
      </div>
      <div className={`mt-6 overflow-x-auto transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-royal-700 text-royal-400">
            <tr>
              <th className="py-2 w-14" />
              <th className="py-2">Code</th>
              <th>Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => {
              const thumb = p.thumbnailUrl || p.images?.[0] || FALLBACK_THUMB;
              return (
                <tr key={p.id} className="border-b border-royal-800/50">
                  <td className="py-2 pe-3">
                    <Link
                      to={`/property/${p.code}`}
                      className="block h-11 w-11 overflow-hidden rounded-lg border border-royal-700 bg-royal-900"
                    >
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </Link>
                  </td>
                  <td className="py-3 text-gold-400">{p.code}</td>
                  <td className="max-w-[14rem] truncate">{p.title}</td>
                  <td>{labelEnum(p.status)}</td>
                  <td className="space-x-2 rtl:space-x-reverse whitespace-nowrap">
                    <Link
                      to={`/property/${p.code}/edit`}
                      className="inline-flex items-center gap-1 rounded bg-royal-800 px-2 py-1 text-xs font-semibold text-gold-300 hover:bg-royal-700 transition"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>دەستکاری</span>
                    </Link>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p)}
                        title={t.submit.deleteProperty}
                        aria-label={t.submit.deleteProperty}
                        className="inline-flex items-center justify-center rounded border border-red-500/30 bg-red-950/40 p-1.5 text-red-400 transition hover:bg-red-900/50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {p.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="text-green-400 text-xs font-semibold hover:underline"
                          onClick={() => approve(p.id, 'APPROVED')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="text-red-400 text-xs font-semibold hover:underline"
                          onClick={() => approve(p.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-royal-800 pt-4 text-sm text-royal-300">
          <div>
            Showing <span className="font-medium text-gold-400">{formatNum((meta.currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
            <span className="font-medium text-gold-400">
              {formatNum(Math.min(meta.currentPage * PAGE_SIZE, meta.totalCount))}
            </span>{' '}
            of <span className="font-medium text-gold-400">{formatNum(meta.totalCount)}</span> entries
          </div>
          <div className="flex gap-2">
            <button
              disabled={meta.currentPage === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded bg-royal-800 px-3 py-1.5 hover:bg-royal-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={meta.currentPage >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded bg-royal-800 px-3 py-1.5 hover:bg-royal-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
