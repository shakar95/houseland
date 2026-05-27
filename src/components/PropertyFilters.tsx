import { SULAYMANIYAH_NEIGHBORHOODS } from '@/lib/neighborhoods';
import type { PropertyFilters as Filters } from '@/types';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function PropertyFiltersPanel({ filters, onChange }: Props) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="card-luxury grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs text-royal-400">Property Code</label>
        <input
          className="input-luxury"
          placeholder="SULI-001"
          value={filters.code ?? ''}
          onChange={(e) => set('code', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Neighborhood</label>
        <select
          className="input-luxury"
          value={filters.neighborhood ?? 'all'}
          onChange={(e) => set('neighborhood', e.target.value)}
        >
          <option value="all">All areas</option>
          {SULAYMANIYAH_NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Property Type</label>
        <select
          className="input-luxury"
          value={filters.propertyType ?? 'all'}
          onChange={(e) => set('propertyType', e.target.value)}
        >
          <option value="all">All types</option>
          {['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'].map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Transaction</label>
        <select
          className="input-luxury"
          value={filters.transactionType ?? 'all'}
          onChange={(e) => set('transactionType', e.target.value)}
        >
          <option value="all">Sale & Rent</option>
          <option value="FOR_SALE">For Sale</option>
          <option value="FOR_RENT">For Rent</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Min Area (m²)</label>
        <input
          type="number"
          className="input-luxury"
          value={filters.minArea ?? ''}
          onChange={(e) => set('minArea', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Max Area (m²)</label>
        <input
          type="number"
          className="input-luxury"
          value={filters.maxArea ?? ''}
          onChange={(e) => set('maxArea', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Min Price</label>
        <input
          type="number"
          className="input-luxury"
          value={filters.minPrice ?? ''}
          onChange={(e) => set('minPrice', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Max Price</label>
        <input
          type="number"
          className="input-luxury"
          value={filters.maxPrice ?? ''}
          onChange={(e) => set('maxPrice', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">Floor Level</label>
        <input
          type="number"
          className="input-luxury"
          value={filters.floor ?? ''}
          onChange={(e) => set('floor', e.target.value)}
        />
      </div>
    </div>
  );
}
