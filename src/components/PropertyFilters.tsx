import { SULAYMANIYAH_NEIGHBORHOODS } from '@/lib/neighborhoods';
import { useLanguage } from '@/context/LanguageContext';
import type { PropertyFilters as Filters } from '@/types';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const types = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'] as const;

export function PropertyFiltersPanel({ filters, onChange }: Props) {
  const { t, enumLabel } = useLanguage();
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="card-luxury grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.code}</label>
        <input
          className="input-luxury"
          placeholder="SULI-001"
          value={filters.code ?? ''}
          onChange={(e) => set('code', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.neighborhood}</label>
        <select
          className="input-luxury"
          value={filters.neighborhood ?? 'all'}
          onChange={(e) => set('neighborhood', e.target.value)}
        >
          <option value="all">{t.filters.allAreas}</option>
          {SULAYMANIYAH_NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.type}</label>
        <select
          className="input-luxury"
          value={filters.propertyType ?? 'all'}
          onChange={(e) => set('propertyType', e.target.value)}
        >
          <option value="all">{t.filters.allTypes}</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {enumLabel(type)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.transaction}</label>
        <select
          className="input-luxury"
          value={filters.transactionType ?? 'all'}
          onChange={(e) => set('transactionType', e.target.value)}
        >
          <option value="all">{t.filters.saleRent}</option>
          <option value="FOR_SALE">{enumLabel('FOR_SALE')}</option>
          <option value="FOR_RENT">{enumLabel('FOR_RENT')}</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.minArea}</label>
        <input type="number" className="input-luxury" value={filters.minArea ?? ''} onChange={(e) => set('minArea', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.maxArea}</label>
        <input type="number" className="input-luxury" value={filters.maxArea ?? ''} onChange={(e) => set('maxArea', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.minPrice}</label>
        <input type="number" className="input-luxury" value={filters.minPrice ?? ''} onChange={(e) => set('minPrice', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.maxPrice}</label>
        <input type="number" className="input-luxury" value={filters.maxPrice ?? ''} onChange={(e) => set('maxPrice', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-royal-400">{t.filters.floor}</label>
        <input type="number" className="input-luxury" value={filters.floor ?? ''} onChange={(e) => set('floor', e.target.value)} />
      </div>
    </div>
  );
}
