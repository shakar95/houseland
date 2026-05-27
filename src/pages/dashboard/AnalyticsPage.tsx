import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import type { Analytics } from '@/types';

interface DashboardData {
  totals: { views: number; phone: number; whatsapp: number };
  sold: number;
  rented: number;
  pending: number;
  active: number;
  topProperties: Analytics[];
}

export function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>('/api/analytics/dashboard').then(setData).catch(() => {});
  }, []);

  if (!data) return <p className="text-royal-400">Loading analytics...</p>;

  const chartData = [
    { name: 'Views', value: data.totals.views },
    { name: 'Phone', value: data.totals.phone },
    { name: 'WhatsApp', value: data.totals.whatsapp },
  ];

  const stats = [
    { label: 'Active Listings', value: data.active },
    { label: 'Pending Approval', value: data.pending },
    { label: 'Sold', value: data.sold },
    { label: 'Rented', value: data.rented },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-gold-400">Analytics</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-luxury p-4">
            <p className="text-sm text-royal-400">{s.label}</p>
            <p className="font-display text-3xl text-gold-400">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card-luxury mt-8 p-4">
        <h2 className="mb-4 text-lg text-gold-300">Engagement</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a4499" />
              <XAxis dataKey="name" stroke="#8aa3f5" />
              <YAxis stroke="#8aa3f5" />
              <Tooltip contentStyle={{ background: '#0c1835', border: '1px solid #d4a017' }} />
              <Bar dataKey="value" fill="#d4a017" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card-luxury mt-8 p-4">
        <h2 className="mb-4 text-lg text-gold-300">Most Viewed</h2>
        <ul className="divide-y divide-royal-700">
          {data.topProperties.map((a) => (
            <li key={a.property?.code} className="flex justify-between py-3 text-sm">
              <span>
                {a.property?.code} — {a.property?.title}
              </span>
              <span className="text-gold-400">{a.viewsCount} views</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
