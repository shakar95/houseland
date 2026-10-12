import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit3,
  Trash2,
  ExternalLink,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Check,
  Copy,
  RotateCw,
  Building2,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { resolveThumbnailUrl } from '@/lib/media';
import { useNeighborhoods, getNeighborhoodLabelByName } from '@/hooks/useNeighborhoods';

const TABS = [
  { id: 'all', label: 'هەموو' },
  { id: 'APPROVED', label: 'پەسەندکراو' },
  { id: 'PENDING', label: 'چاوەڕوان' },
  { id: 'SOLD', label: 'فرۆشراو' },
  { id: 'RENTED', label: 'کرێدراو' },
  { id: 'REJECTED', label: 'ڕەتکراو' },
] as const;

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=120';
const PAGE_SIZE = 50;

type ListMeta = { totalCount: number; totalPages: number; currentPage: number };
type ListPayload = { data: Property[]; meta: ListMeta };

function listPath(tab: string, page: number) {
  const status = tab === 'all' ? 'all' : tab;
  return `/api/properties?status=${status}&page=${page}&limit=${PAGE_SIZE}`;
}

export function PropertiesPage() {
  const { formatNum, t, lang, enumLabel } = useLanguage();
  const { neighborhoods } = useNeighborhoods();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const [tab, setTab] = useState<string>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ListMeta>({ totalCount: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Client-side quick search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'code_desc' | 'price_desc' | 'price_asc'>('code_desc');

  // Stats summary counts
  const [statsSummary, setStatsSummary] = useState<{
    total: number;
    approved: number;
    pending: number;
    soldRented: number;
  }>({ total: 0, approved: 0, pending: 0, soldRented: 0 });

  // Contract form
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    propertyId: '',
    clientName: '',
    amount: 0,
    contractType: 'SALE',
    date: new Date().toISOString().slice(0, 10),
  });

  const cacheRef = useRef(new Map<string, { payload: ListPayload; at: number }>());

  const applyPayload = useCallback((payload: ListPayload) => {
    setProperties(payload.data);
    setMeta(payload.meta);
  }, []);

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Fetch dashboard summary stats
  const fetchSummaryStats = useCallback(() => {
    api
      .get<{
        sold: number;
        rented: number;
        pending: number;
        active: number;
      }>('/api/analytics/dashboard')
      .then((d) => {
        setStatsSummary({
          total: (d.active || 0) + (d.pending || 0) + (d.sold || 0) + (d.rented || 0),
          approved: d.active || 0,
          pending: d.pending || 0,
          soldRented: (d.sold || 0) + (d.rented || 0),
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSummaryStats();
  }, [fetchSummaryStats]);

  const changeTab = (next: string) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
  };

  useEffect(() => {
    const key = `${tab}:${page}`;
    const cached = cacheRef.current.get(key);
    const fresh = cached && Date.now() - cached.at < 60_000;

    if (fresh) {
      applyPayload(cached.payload);
      setLoading(false);
      return;
    }

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
      fetchSummaryStats();
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tab, page, applyPayload, invalidateCache, fetchSummaryStats]);

  // Fast Status Updater
  const handleUpdateStatus = async (p: Property, nextStatus: string) => {
    if (p.status === nextStatus) return;
    setUpdatingStatusId(p.id);

    // Optimistic update
    setProperties((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, status: nextStatus } : item))
    );

    try {
      await api.patch(`/api/properties/${p.id}`, { status: nextStatus });
      invalidateCache();
      fetchSummaryStats();
    } catch (err) {
      alert('نەتوانرا دۆخی موڵکەکە نوێبکرێتەوە');
      reload();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (p: Property) => {
    if (!window.confirm(t.submit.deleteConfirm)) return;
    setDeletingId(p.id);
    try {
      await api.delete(`/api/properties/${p.id}`);
      invalidateCache();
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
      setMeta((m) => ({ ...m, totalCount: Math.max(0, m.totalCount - 1) }));
      fetchSummaryStats();
    } catch {
      alert(t.submit.failed);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/property/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/contracts', {
        ...contractForm,
        date: new Date(contractForm.date).toISOString(),
      });
      alert('گرێبەست بە سەرکەوتوویی دروستکرا!');
      setShowContractModal(false);
      setContractForm({
        propertyId: '',
        clientName: '',
        amount: 0,
        contractType: 'SALE',
        date: new Date().toISOString().slice(0, 10),
      });
      await reload();
    } catch (err) {
      alert('شکست لە دروستکردنی گرێبەست');
    }
  };

  // Filtered and sorted properties list
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim().replace(/^#/, '');
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.neighborhood?.toLowerCase().includes(q)
      );
    }

    if (transactionFilter !== 'all') {
      result = result.filter((p) => p.transactionType === transactionFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.propertyType === typeFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      // Numerical code descending
      const numA = parseInt(a.code, 10) || 0;
      const numB = parseInt(b.code, 10) || 0;
      return numB - numA;
    });

    return result;
  }, [properties, searchQuery, transactionFilter, typeFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            بەڕێوەبردنی موڵکەکان
          </h1>
          <p className="mt-1 text-xs text-royal-300 sm:text-sm">
            چاودێری، پەسەندکردن، و دەستکاریکردنی هەموو موڵکە تۆمارکراوەکان لە سیستەمدا.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-royal-700 bg-royal-900/80 text-royal-200 transition hover:border-gold-500/50 hover:text-gold-300 active:scale-95 disabled:opacity-50"
            title="نوێکردنەوە"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-gold-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowContractModal(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-gold-300 transition hover:bg-gold-500/20 active:scale-95"
          >
            <FileText className="h-4 w-4 text-gold-400" />
            <span className="hidden sm:inline">دروستکردنی گرێبەست</span>
          </button>
          <Link
            to="/submit"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-royal-950 shadow-md shadow-gold-500/20 transition hover:brightness-105 active:scale-95 shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>موڵکی نوێ زیاد بکە</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 w-full min-w-0">
        <div className="rounded-2xl border border-royal-800/80 bg-gradient-to-br from-royal-900/60 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-royal-300 truncate">سەرجەم موڵکەکان</span>
            <Building2 className="h-4 w-4 text-gold-400 shrink-0" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{formatNum(statsSummary.total || meta.totalCount)}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-emerald-300 truncate">پەسەندکراو و چالاک</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">{formatNum(statsSummary.approved)}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-amber-300 truncate">چاوەڕوانی پەسەندکردن</span>
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-400">{formatNum(statsSummary.pending)}</p>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-blue-300 truncate">مامەڵەکراو</span>
            <CheckSquare className="h-4 w-4 text-blue-400 shrink-0" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-400">{formatNum(statsSummary.soldRented)}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls Card */}
      <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-3.5 sm:p-4 shadow-xl backdrop-blur-md space-y-4 min-w-0 w-full">
        {/* Status Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full min-w-0">
          {TABS.map((tTab) => {
            const active = tab === tTab.id;
            return (
              <button
                key={tTab.id}
                type="button"
                onClick={() => changeTab(tTab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  active
                    ? 'border border-gold-400 bg-gradient-to-r from-gold-400 to-gold-500 text-royal-950 font-bold shadow-md shadow-gold-500/20'
                    : 'border border-royal-800 bg-royal-950/60 text-royal-300 hover:text-white hover:border-royal-700'
                }`}
              >
                <span>{tTab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search, Transaction, Type & Sort Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Real-time search */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان بەپێی کۆد، ناونیشان یان گەڕەک..."
              className="w-full rounded-xl border border-royal-700/80 bg-royal-950/80 py-2.5 ps-9 pe-3 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-royal-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Transaction Filter */}
          <select
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value)}
            className="rounded-xl border border-royal-700/80 bg-royal-950/80 px-3 py-2.5 text-xs text-royal-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="all">هەموو مامەڵەکان</option>
            <option value="FOR_SALE">فرۆشتن (For Sale)</option>
            <option value="FOR_RENT">کرێ (For Rent)</option>
            <option value="FOR_EXCHANGE">گۆڕینەوە (Exchange)</option>
          </select>

          {/* Property Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-royal-700/80 bg-royal-950/80 px-3 py-2.5 text-xs text-royal-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="all">هەموو جۆرەکانی موڵک</option>
            <option value="HOUSE">خانوو (House)</option>
            <option value="APARTMENT">شوقە (Apartment)</option>
            <option value="VILLA">ڤێلا (Villa)</option>
            <option value="LAND">زەوی (Land)</option>
            <option value="COMMERCIAL">بازرگانی (Commercial)</option>
            <option value="SHOP">دوکان (Shop)</option>
            <option value="FARM">کێڵگە (Farm)</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-royal-700/80 bg-royal-950/80 px-3 py-2.5 text-xs text-gold-300 focus:border-gold-400 focus:outline-none"
          >
            <option value="code_desc">ڕیزبەندی بەپێی کۆد (گەورە بۆ بچووک)</option>
            <option value="price_desc">ڕیزبەندی بەپێی نرخ (گرانترین)</option>
            <option value="price_asc">ڕیزبەندی بەپێی نرخ (هەرزانترین)</option>
          </select>
        </div>
      </div>

      {/* Main Properties Content Area */}
      {loading && properties.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-royal-800/80 bg-royal-900/30">
          <div className="flex items-center gap-3 text-gold-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
            <span className="text-sm font-semibold">{t.common.loading}</span>
          </div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-royal-800 bg-royal-900/20 py-16 text-center text-royal-400">
          <Building2 className="mx-auto h-10 w-10 text-royal-600 mb-2" />
          <p className="text-sm font-medium">هیچ موڵکێک لەژێر ئەم فلتەرە نەدۆزرایەوە</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-royal-800/80 bg-royal-900/40 shadow-xl backdrop-blur-md">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-royal-800/80 bg-royal-950/70 text-royal-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-14">وێنە</th>
                  <th className="py-3 px-3">کۆد</th>
                  <th className="py-3 px-4">موڵک و گەڕەک</th>
                  <th className="py-3 px-3">جۆر و مامەڵە</th>
                  <th className="py-3 px-3">نرخ</th>
                  <th className="py-3 px-3">دۆخی بڵاوکراوە</th>
                  <th className="py-3 px-4 text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal-800/50">
                {filteredProperties.map((p) => {
                  const thumb = resolveThumbnailUrl(p.thumbnailUrl || p.images?.[0], p.videoLink);
                  const isUpdating = updatingStatusId === p.id;
                  const isDeleting = deletingId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-royal-800/30 transition-colors ${
                        isUpdating ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <td className="py-2.5 px-4">
                        <Link
                          to={`/property/${p.code}`}
                          className="block h-12 w-12 overflow-hidden rounded-xl border border-royal-700 bg-royal-900 shadow-sm"
                        >
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover transition hover:scale-110"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB;
                            }}
                          />
                        </Link>
                      </td>

                      {/* Code Badge */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center rounded-lg border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-xs font-bold text-gold-400">
                          #{p.code}
                        </span>
                      </td>

                      {/* Title & Neighborhood */}
                      <td className="py-2.5 px-4 max-w-xs">
                        <Link
                          to={`/property/${p.code}`}
                          className="font-semibold text-white hover:text-gold-300 transition truncate block"
                          title={p.title}
                        >
                          {p.title || `موڵکی #${p.code}`}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-royal-400">
                          {getNeighborhoodLabelByName(p.neighborhood, neighborhoods, lang)}
                        </p>
                      </td>

                      {/* Type & Transaction */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="rounded-md bg-royal-950/80 border border-royal-700/60 px-2 py-0.5 text-[10px] font-medium text-royal-200">
                          {enumLabel(p.propertyType)} · {enumLabel(p.transactionType)}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-gold-300">
                        {formatPrice(p.price, p.currency, lang)}
                      </td>

                      {/* Status Selector */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <select
                          value={p.status}
                          disabled={isUpdating}
                          onChange={(e) => handleUpdateStatus(p, e.target.value)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer border outline-none transition ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : p.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : p.status === 'SOLD'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : p.status === 'RENTED'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          <option value="APPROVED" className="bg-royal-950 text-white">پەسەندکراو</option>
                          <option value="PENDING" className="bg-royal-950 text-white">چاوەڕوان</option>
                          <option value="SOLD" className="bg-royal-950 text-white">فرۆشراو</option>
                          <option value="RENTED" className="bg-royal-950 text-white">کرێدراو</option>
                          <option value="REJECTED" className="bg-royal-950 text-white">ڕەتکراو</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Live */}
                          <Link
                            to={`/property/${p.code}`}
                            title="بینین لە ئەپدا"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-royal-700 bg-royal-900/60 text-royal-300 transition hover:border-gold-500/40 hover:text-gold-300 active:scale-95"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>

                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(p.code)}
                            title="کۆپیکردنی لینک"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-royal-700 bg-royal-900/60 text-royal-300 transition hover:border-gold-500/40 hover:text-gold-300 active:scale-95"
                          >
                            {copiedCode === p.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Edit */}
                          <Link
                            to={`/property/${p.code}/edit`}
                            title="دەستکاری"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400 transition hover:bg-gold-500/20 active:scale-95"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Link>

                          {/* Delete */}
                          {isAdmin && (
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDelete(p)}
                              title={t.submit.deleteProperty}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/40 text-red-400 transition hover:bg-red-900/50 active:scale-95 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (Visible on mobile screens) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredProperties.map((p) => {
              const thumb = resolveThumbnailUrl(p.thumbnailUrl || p.images?.[0], p.videoLink);
              const isUpdating = updatingStatusId === p.id;
              const isDeleting = deletingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border border-royal-800/80 bg-royal-900/40 p-3.5 shadow-md backdrop-blur-md space-y-3 ${
                    isUpdating ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Link
                      to={`/property/${p.code}`}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-royal-700 bg-royal-900 shadow-sm"
                    >
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB;
                        }}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-xs font-bold text-gold-400">
                          #{p.code}
                        </span>
                        <span className="font-bold text-gold-300 text-sm">
                          {formatPrice(p.price, p.currency, lang)}
                        </span>
                      </div>

                      <Link
                        to={`/property/${p.code}`}
                        className="mt-1 font-semibold text-white text-xs line-clamp-1 block"
                      >
                        {p.title || `موڵکی #${p.code}`}
                      </Link>

                      <p className="mt-0.5 text-[11px] text-royal-400">
                        {getNeighborhoodLabelByName(p.neighborhood, neighborhoods, lang)} · {enumLabel(p.propertyType)}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Status and Quick Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-royal-800/60">
                    <select
                      value={p.status}
                      disabled={isUpdating}
                      onChange={(e) => handleUpdateStatus(p, e.target.value)}
                      className={`rounded-lg px-2 py-1 text-xs font-bold border outline-none ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : p.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : p.status === 'SOLD'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : p.status === 'RENTED'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      <option value="APPROVED" className="bg-royal-950 text-white">پەسەندکراو</option>
                      <option value="PENDING" className="bg-royal-950 text-white">چاوەڕوان</option>
                      <option value="SOLD" className="bg-royal-950 text-white">فرۆشراو</option>
                      <option value="RENTED" className="bg-royal-950 text-white">کرێدراو</option>
                      <option value="REJECTED" className="bg-royal-950 text-white">ڕەتکراو</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/property/${p.code}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-royal-700 bg-royal-900 text-royal-300 transition active:scale-95"
                        title="بینین"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(p.code)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-royal-700 bg-royal-900 text-royal-300 transition active:scale-95"
                        title="کۆپی لینکی موڵک"
                      >
                        {copiedCode === p.code ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <Link
                        to={`/property/${p.code}/edit`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400 transition active:scale-95"
                        title="دەستکاری"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>

                      {isAdmin && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/40 text-red-400 transition active:scale-95 disabled:opacity-50"
                          title="سڕینەوە"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-royal-800/80 bg-royal-900/30 p-4 text-xs text-royal-300">
              <div>
                پیشاندانی <span className="font-bold text-gold-400">{formatNum((meta.currentPage - 1) * PAGE_SIZE + 1)}</span> بۆ{' '}
                <span className="font-bold text-gold-400">
                  {formatNum(Math.min(meta.currentPage * PAGE_SIZE, meta.totalCount))}
                </span>{' '}
                لە کۆی <span className="font-bold text-gold-400">{formatNum(meta.totalCount)}</span> موڵک
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={meta.currentPage === 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-royal-700 bg-royal-900/80 px-4 py-2 font-semibold text-royal-200 transition hover:border-gold-500/40 hover:text-white disabled:opacity-40 active:scale-95"
                >
                  پێشوو
                </button>
                <button
                  type="button"
                  disabled={meta.currentPage >= meta.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-royal-700 bg-royal-900/80 px-4 py-2 font-semibold text-royal-200 transition hover:border-gold-500/40 hover:text-white disabled:opacity-40 active:scale-95"
                >
                  دواتر
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Contract Generator Modal / Overlay */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-royal-700 bg-gradient-to-b from-royal-900 to-royal-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-lg font-bold text-white">دروستکردنی گرێبەستی موڵک</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="text-royal-400 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={createContract} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-royal-300">موڵک هەڵبژێرە</label>
                <select
                  className="input-luxury text-xs"
                  value={contractForm.propertyId}
                  onChange={(e) => setContractForm({ ...contractForm, propertyId: e.target.value })}
                  required
                >
                  <option value="">موڵکێک هەڵبژێرە...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.code} — {p.title || `موڵک`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-royal-300">ناوی کڕیار / بەکرێگرتە</label>
                <input
                  className="input-luxury text-xs"
                  placeholder="ناوی تەواوی موشتەری"
                  value={contractForm.clientName}
                  onChange={(e) => setContractForm({ ...contractForm, clientName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-royal-300">بڕی پارە ($)</label>
                  <input
                    type="number"
                    className="input-luxury text-xs"
                    placeholder="بڕ بە دۆلار"
                    value={contractForm.amount || ''}
                    onChange={(e) => setContractForm({ ...contractForm, amount: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-royal-300">جۆری گرێبەست</label>
                  <select
                    className="input-luxury text-xs"
                    value={contractForm.contractType}
                    onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}
                  >
                    <option value="SALE">فرۆشتن (Sale)</option>
                    <option value="RENT">کرێ (Rent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-royal-300">بەرواری گرێبەست</label>
                <input
                  type="date"
                  className="input-luxury text-xs"
                  value={contractForm.date}
                  onChange={(e) => setContractForm({ ...contractForm, date: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="w-1/2 rounded-xl border border-royal-700 py-2.5 text-xs font-semibold text-royal-300 hover:text-white"
                >
                  پاشگەزبوونەوە
                </button>
                <button type="submit" className="w-1/2 btn-gold text-xs py-2.5">
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
