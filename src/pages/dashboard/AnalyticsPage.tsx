import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Eye,
  Phone,
  MessageCircle,
  TrendingUp,
  Award,
  Users,
  Building2,
  ExternalLink,
  Search,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart2,
  DollarSign,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Analytics, CrmEntry, Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { resolveThumbnailUrl } from '@/lib/media';
import { useNeighborhoods, getNeighborhoodLabelByName } from '@/hooks/useNeighborhoods';

interface DashboardData {
  totals: { views: number; phone: number; whatsapp: number };
  sold: number;
  rented: number;
  pending: number;
  active: number;
  topProperties: Analytics[];
}

const COLORS = ['#d4a017', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#64748b'];

export function AnalyticsPage() {
  const { formatNum, lang, enumLabel } = useLanguage();
  const { neighborhoods } = useNeighborhoods();

  const [activeTab, setActiveTab] = useState<'overview' | 'top_posts' | 'audience' | 'all_views'>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [crmEntries, setCrmEntries] = useState<CrmEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Search in all views ledger
  const [postSearch, setPostSearch] = useState('');
  const [postSort, setPostSort] = useState<'views' | 'inquiries' | 'code'>('views');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<DashboardData>('/api/analytics/dashboard').catch(() => null),
      api.get<{ data: Property[] }>('/api/properties?status=all&limit=250').catch(() => ({ data: [] })),
      api.get<CrmEntry[]>('/api/crm').catch(() => []),
    ])
      .then(([dashData, propsData, crmData]) => {
        if (dashData) setData(dashData);
        if (propsData?.data) setProperties(propsData.data);
        if (crmData) setCrmEntries(crmData);
      })
      .finally(() => setLoading(false));
  }, []);

  // Merged properties with their analytics
  const mergedPropertyList = useMemo(() => {
    const analyticsMap = new Map<string, Analytics>();
    if (data?.topProperties) {
      data.topProperties.forEach((a) => {
        if (a.property?.code) analyticsMap.set(a.property.code, a);
      });
    }

    return properties.map((p) => {
      const an = analyticsMap.get(p.code) || p.analytics;
      const views = an?.viewsCount ?? (p as any).viewsCount ?? 0;
      const phone = an?.phoneClicks ?? (p as any).phoneClicks ?? 0;
      const wa = an?.whatsappClicks ?? (p as any).whatsappClicks ?? 0;
      const inquiries = phone + wa;
      return {
        ...p,
        viewsCount: views,
        phoneClicks: phone,
        whatsappClicks: wa,
        inquiries,
      };
    });
  }, [properties, data]);

  // Top posts sorted
  const topRankedPosts = useMemo(() => {
    return [...mergedPropertyList]
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, 10);
  }, [mergedPropertyList]);

  // Filtered post view list
  const filteredPosts = useMemo(() => {
    let list = [...mergedPropertyList];
    if (postSearch.trim()) {
      const q = postSearch.toLowerCase().trim().replace(/^#/, '');
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.neighborhood?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (postSort === 'views') return b.viewsCount - a.viewsCount;
      if (postSort === 'inquiries') return b.inquiries - a.inquiries;
      const numA = parseInt(a.code, 10) || 0;
      const numB = parseInt(b.code, 10) || 0;
      return numB - numA;
    });

    return list;
  }, [mergedPropertyList, postSearch, postSort]);

  // Inventory distribution by property type
  const propertyTypeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      counts[p.propertyType] = (counts[p.propertyType] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: enumLabel(type),
      count,
    }));
  }, [properties, enumLabel]);

  // Transaction distribution
  const transactionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      counts[p.transactionType] = (counts[p.transactionType] || 0) + 1;
    });
    return Object.entries(counts).map(([tx, count]) => ({
      name: enumLabel(tx),
      count,
    }));
  }, [properties, enumLabel]);

  // Audience / Lead Pipeline categorization
  const leadPipelineStats = useMemo(() => {
    const counts: Record<string, number> = {
      LEAD: 0,
      CONTACTED: 0,
      VIEWING: 0,
      OFFER: 0,
      CLOSED: 0,
      LOST: 0,
    };
    crmEntries.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      } else {
        counts.LEAD++;
      }
    });

    const labels: Record<string, string> = {
      LEAD: 'سەرەتایی (Lead)',
      CONTACTED: 'پەیوەندیکراو (Contacted)',
      VIEWING: 'بینینی موڵک (Viewing)',
      OFFER: 'پێشکەشکردنی نرخ (Offer)',
      CLOSED: 'مامەڵەی تەواوکراو (Closed)',
      LOST: 'لەدەستچوو (Lost)',
    };

    return Object.entries(counts).map(([key, count]) => ({
      status: key,
      label: labels[key] || key,
      count,
    }));
  }, [crmEntries]);

  // Customer Budget Segments
  const budgetSegments = useMemo(() => {
    let low = 0; // < $100k
    let mid = 0; // $100k - $200k
    let high = 0; // > $200k
    crmEntries.forEach((c) => {
      const b = c.budget || 0;
      if (b > 200000) high++;
      else if (b >= 100000) mid++;
      else if (b > 0) low++;
    });

    return [
      { name: 'لوکس (> $200k)', count: high },
      { name: 'ناوەند ($100k - $200k)', count: mid },
      { name: 'گونجاو (< $100k)', count: low },
    ];
  }, [crmEntries]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-gold-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
          <span className="text-sm font-semibold">ئامادەکردنی ئینسایتس و شیکارییەکان...</span>
        </div>
      </div>
    );
  }

  const totals = data?.totals || { views: 0, phone: 0, whatsapp: 0 };
  const totalInquiries = totals.phone + totals.whatsapp;
  const inquiryRate = totals.views > 0 ? ((totalInquiries / totals.views) * 100).toFixed(1) : '0';

  const engagementChartData = [
    { name: 'سەردان و بینین (Views)', count: totals.views },
    { name: 'پەیوەندی تەلەفۆن (Phone)', count: totals.phone },
    { name: 'واتسئاپ (WhatsApp)', count: totals.whatsapp },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              ئینسایتس و شیکاری گشتی
            </h1>
          </div>
          <p className="mt-1 text-xs text-royal-300 sm:text-sm">
            شیکاری وردی ژمارەی بینینەکان، کارلێکی کڕیاران لەگەڵ پۆستەکان، و پۆلێنکردنی موڵکە سەرکەوتووەکان.
          </p>
        </div>

        {/* In-page Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-royal-800 bg-royal-950/80 p-1.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-royal-950 font-bold shadow-md shadow-gold-500/20'
                : 'text-royal-300 hover:text-white'
            }`}
          >
            گشتی و کارلێک
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('top_posts')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'top_posts'
                ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-royal-950 font-bold shadow-md shadow-gold-500/20'
                : 'text-royal-300 hover:text-white'
            }`}
          >
            تۆپ پۆستەکان
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all_views')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all_views'
                ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-royal-950 font-bold shadow-md shadow-gold-500/20'
                : 'text-royal-300 hover:text-white'
            }`}
          >
            بینینی هەموو پۆستەکان
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audience')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'audience'
                ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-royal-950 font-bold shadow-md shadow-gold-500/20'
                : 'text-royal-300 hover:text-white'
            }`}
          >
            پۆلێنکردنی کڕیاران
          </button>
        </div>
      </div>

      {/* Top Insights KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Views */}
        <div className="rounded-3xl border border-royal-800/80 bg-gradient-to-br from-royal-900/60 to-royal-950/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-royal-300">سەرجەم بینینەکان</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400 border border-gold-500/20">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-white">{formatNum(totals.views)}</p>
          <p className="mt-1 text-[11px] text-gold-400/90 font-medium">بینینی ڕاستەقینەی پۆستەکان</p>
        </div>

        {/* Total Inquiries */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-royal-950/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">پەیوەندی کڕیاران</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-400">{formatNum(totalInquiries)}</p>
          <p className="mt-1 text-[11px] text-emerald-300/80 font-medium">
            تەلەفۆن ({totals.phone}) · واتسئاپ ({totals.whatsapp})
          </p>
        </div>

        {/* Engagement Rate */}
        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-royal-950/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-300">ڕێژەی بەشداری (Inquiry Rate)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-blue-400">{inquiryRate}%</p>
          <p className="mt-1 text-[11px] text-blue-300/80 font-medium">ڕێژەی ئەوانەی پەیوەندی دەکەن</p>
        </div>

        {/* Active Inventory */}
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-royal-950/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-300">کۆی موڵکەکان</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-purple-400">
            {formatNum(properties.length || data?.active || 0)}
          </p>
          <p className="mt-1 text-[11px] text-purple-300/80 font-medium">
            چالاک ({data?.active || 0}) · فرۆشراو ({data?.sold || 0})
          </p>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Traffic & Engagement Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Engagement Volume Chart */}
            <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-gold-400" />
                  <h3 className="font-display text-base font-bold text-white">ئاستی سەردان و کارلێک</h3>
                </div>
                <span className="text-[11px] text-royal-400 font-medium">سەرجەم تۆمارەکان</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#152550" />
                    <XAxis dataKey="name" stroke="#8aa3f5" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#8aa3f5" tick={{ fontSize: 10 }} tickFormatter={(v) => formatNum(Number(v))} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#060d1f', border: '1px solid rgba(212, 160, 23, 0.4)', borderRadius: 12 }}
                      formatter={(val: number) => [formatNum(val), 'ژمارە']}
                    />
                    <Bar dataKey="count" fill="#d4a017" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Distribution by Type */}
            <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-gold-400" />
                  <h3 className="font-display text-base font-bold text-white">پۆلێنکردن بەپێی جۆر</h3>
                </div>
                <span className="text-[11px] text-royal-400 font-medium">{properties.length} موڵک</span>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={propertyTypeStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={40}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {propertyTypeStats.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#060d1f', border: '1px solid rgba(212, 160, 23, 0.4)', borderRadius: 12 }}
                      formatter={(val: number) => [formatNum(val), 'موڵک']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction Distribution */}
            <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-gold-400" />
                  <h3 className="font-display text-base font-bold text-white">پۆلێن بەپێی مامەڵە</h3>
                </div>
                <span className="text-[11px] text-royal-400 font-medium">فرۆشتن و کرێ</span>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={40}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {transactionStats.map((_, i) => (
                        <Cell key={`tx-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#060d1f', border: '1px solid rgba(212, 160, 23, 0.4)', borderRadius: 12 }}
                      formatter={(val: number) => [formatNum(val), 'موڵک']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top 5 Quick Preview Bar */}
          <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-base font-bold text-white">پڕبینەرترین پۆستەکانی ئەم کاتە</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('top_posts')}
                className="text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                <span>بینینی هەموو پۆستە تۆپەکان</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topRankedPosts.slice(0, 3).map((p, idx) => {
                const thumb = resolveThumbnailUrl(p.thumbnailUrl || p.images?.[0], p.videoLink);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-royal-800/80 bg-royal-950/60 p-3 hover:border-gold-500/40 transition"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-md ${
                        idx === 0
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-royal-950'
                          : idx === 1
                          ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-royal-950'
                          : 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <img
                      src={thumb}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover border border-royal-700 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gold-400">#{p.code}</span>
                        <span className="text-xs font-bold text-emerald-400">{formatNum(p.viewsCount)} بینین</span>
                      </div>
                      <p className="truncate text-xs font-medium text-white mt-0.5">{p.title || `موڵکی #${p.code}`}</p>
                      <p className="text-[10px] text-royal-400">
                        {p.phoneClicks} پەیوەندی · {p.whatsappClicks} واتسئاپ
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOP RATED / MOST VIEWED POSTS LEADERBOARD */}
      {activeTab === 'top_posts' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-lg font-bold text-white">تۆپ ١٠ لە پڕبینەرترین پۆستەکانی موڵک</h3>
              </div>
              <span className="text-xs text-royal-400 font-medium">ڕیزبەندی بەپێی زۆرترین سەردان</span>
            </div>

            <div className="divide-y divide-royal-800/60">
              {topRankedPosts.map((p, idx) => {
                const thumb = resolveThumbnailUrl(p.thumbnailUrl || p.images?.[0], p.videoLink);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-royal-800/20 px-2 rounded-2xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-md ${
                          idx === 0
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-royal-950 ring-2 ring-gold-400/50'
                            : idx === 1
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-royal-950'
                            : idx === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                            : 'bg-royal-800 text-royal-300'
                        }`}
                      >
                        #{idx + 1}
                      </span>

                      <Link
                        to={`/property/${p.code}`}
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-royal-700 bg-royal-900 shadow-sm"
                      >
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      </Link>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-xs font-bold text-gold-400">
                            #{p.code}
                          </span>
                          <span className="text-xs font-bold text-gold-300">
                            {formatPrice(p.price, p.currency, lang)}
                          </span>
                        </div>
                        <Link
                          to={`/property/${p.code}`}
                          className="font-semibold text-white text-xs sm:text-sm hover:text-gold-300 transition line-clamp-1 mt-0.5"
                        >
                          {p.title || `موڵکی #${p.code}`}
                        </Link>
                        <p className="text-[11px] text-royal-400">
                          {getNeighborhoodLabelByName(p.neighborhood, neighborhoods, lang)} · {enumLabel(p.propertyType)}
                        </p>
                      </div>
                    </div>

                    {/* Stats metrics */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-royal-800/60 pt-2 sm:pt-0">
                      <div className="text-center sm:text-end">
                        <span className="text-[10px] text-royal-400 block">بینینەکان</span>
                        <span className="text-sm font-black text-white flex items-center gap-1 sm:justify-end">
                          <Eye className="h-3.5 w-3.5 text-gold-400" />
                          {formatNum(p.viewsCount)}
                        </span>
                      </div>

                      <div className="text-center sm:text-end">
                        <span className="text-[10px] text-royal-400 block">پەیوەندی</span>
                        <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 sm:justify-end">
                          <Phone className="h-3.5 w-3.5" />
                          {formatNum(p.phoneClicks)}
                        </span>
                      </div>

                      <div className="text-center sm:text-end">
                        <span className="text-[10px] text-royal-400 block">واتسئاپ</span>
                        <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 sm:justify-end">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {formatNum(p.whatsappClicks)}
                        </span>
                      </div>

                      <Link
                        to={`/property/${p.code}`}
                        className="rounded-xl border border-royal-700 bg-royal-900 p-2 text-royal-300 hover:text-gold-300 transition active:scale-95"
                        title="سەردانی پۆست"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETE POST-BY-POST VIEW LEDGER */}
      {activeTab === 'all_views' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-royal-800 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-white">بینینی سەرجەم پۆستەکان بە وردی</h3>
                <p className="text-xs text-royal-400 mt-0.5">زانیاری هەموو پۆستێک لەگەڵ ژمارەی بینین و بەشداری موشتەرییەکان.</p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-royal-400" />
                  <input
                    type="text"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    placeholder="گەڕان بەپێی کۆد..."
                    className="rounded-xl border border-royal-700/80 bg-royal-950/80 py-2 ps-8 pe-3 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none"
                  />
                </div>
                <select
                  value={postSort}
                  onChange={(e) => setPostSort(e.target.value as any)}
                  className="rounded-xl border border-royal-700/80 bg-royal-950/80 px-3 py-2 text-xs text-gold-300 focus:border-gold-400 focus:outline-none"
                >
                  <option value="views">زۆرترین بینین</option>
                  <option value="inquiries">زۆرترین پەیوەندی</option>
                  <option value="code">ڕیزبەندی بەپێی کۆد</option>
                </select>
              </div>
            </div>

            {/* Posts Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-royal-800/80 text-royal-400 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">کۆد</th>
                    <th className="py-2.5 px-3">موڵک</th>
                    <th className="py-2.5 px-3">نرخ</th>
                    <th className="py-2.5 px-3 text-center">بینین (Views)</th>
                    <th className="py-2.5 px-3 text-center">تەلەفۆن</th>
                    <th className="py-2.5 px-3 text-center">واتسئاپ</th>
                    <th className="py-2.5 px-3 text-center">ڕێژەی کارلێک</th>
                    <th className="py-2.5 px-3 text-center">بینین</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royal-800/40">
                  {filteredPosts.map((p) => {
                    const rate = p.viewsCount > 0 ? ((p.inquiries / p.viewsCount) * 100).toFixed(1) : '0';
                    return (
                      <tr key={p.id} className="hover:bg-royal-800/20 transition">
                        <td className="py-2.5 px-3">
                          <span className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-xs font-bold text-gold-400">
                            #{p.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate">
                          <Link to={`/property/${p.code}`} className="font-semibold text-white hover:text-gold-300">
                            {p.title || `موڵکی #${p.code}`}
                          </Link>
                          <span className="block text-[10px] text-royal-400">
                            {getNeighborhoodLabelByName(p.neighborhood, neighborhoods, lang)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gold-300">
                          {formatPrice(p.price, p.currency, lang)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-white">
                          {formatNum(p.viewsCount)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">
                          {formatNum(p.phoneClicks)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-400 font-semibold">
                          {formatNum(p.whatsappClicks)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-blue-400">
                          {rate}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            to={`/property/${p.code}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-royal-700 bg-royal-900 text-royal-300 hover:text-gold-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIENCE & CUSTOMER SEGMENTATION */}
      {activeTab === 'audience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Pipeline Breakdown */}
            <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gold-400" />
                  <h3 className="font-display text-base font-bold text-white">پۆلێنکردنی قۆناغی موشتەرییەکان (Leads)</h3>
                </div>
                <span className="text-[11px] text-royal-400 font-medium">{crmEntries.length} کڕیار</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadPipelineStats} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#152550" />
                    <XAxis type="number" stroke="#8aa3f5" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="label" type="category" stroke="#8aa3f5" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#060d1f', border: '1px solid rgba(212, 160, 23, 0.4)', borderRadius: 12 }}
                      formatter={(val: number) => [formatNum(val), 'ژمارەی کڕیار']}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customer Budget Segmentation */}
            <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gold-400" />
                  <h3 className="font-display text-base font-bold text-white">توانای دارایی و بودجەی موشتەرییەکان</h3>
                </div>
                <span className="text-[11px] text-royal-400 font-medium">پشکنینی بودجە</span>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetSegments}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {budgetSegments.map((_, i) => (
                        <Cell key={`budget-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#060d1f', border: '1px solid rgba(212, 160, 23, 0.4)', borderRadius: 12 }}
                      formatter={(val: number) => [formatNum(val), 'کڕیار']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick CRM Direct Link Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-gold-500/30 bg-gradient-to-r from-gold-950/30 via-royal-950 to-royal-900 p-5 backdrop-blur-md">
            <div>
              <h4 className="font-display text-base font-bold text-gold-300">بەڕێوەبردنی تەواوی زانیاری کڕیارەکان لە CRM</h4>
              <p className="text-xs text-royal-300 mt-0.5">دەتوانیت پەیوەندی بە موشتەرییەکانەوە بکەیت، داواکارییەکانیان تۆمار بکەیت و موڵکی گونجاویان بۆ بدۆزیتەوە.</p>
            </div>
            <Link
              to="/dashboard/crm"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 px-5 py-2.5 text-xs font-bold text-royal-950 shrink-0 shadow-lg"
            >
              <Users className="h-4 w-4" />
              <span>چوون بۆ بەشی CRM</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
