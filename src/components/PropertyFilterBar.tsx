import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { SULAYMANIYAH_NEIGHBORHOODS } from '@/lib/neighborhoods';
import { useLanguage } from '@/context/LanguageContext';
import type { PropertyFilters } from '@/types';

interface Props {
  filters: PropertyFilters;
  onChange: (f: PropertyFilters) => void;
  resultCount?: number;
}

const types = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'] as const;

export function PropertyFilterBar({ filters, onChange, resultCount }: Props) {
  const { t, enumLabel } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const set = (key: keyof PropertyFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const toggleTransaction = (value: string) => {
    const current = filters.transactionType ?? 'all';
    set('transactionType', current === value ? 'all' : value);
  };

  const toggleType = (value: string) => {
    const current = filters.propertyType ?? 'all';
    set('propertyType', current === value ? 'all' : value);
  };

  const hasActive =
    (filters.code && filters.code.length > 0) ||
    (filters.neighborhood && filters.neighborhood !== 'all') ||
    (filters.propertyType && filters.propertyType !== 'all') ||
    (filters.transactionType && filters.transactionType !== 'all') ||
    filters.minArea ||
    filters.maxArea ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.floor;

  const clearAll = () => onChange({});

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <input
          type="search"
          className="filter-search"
          placeholder={t.app.searchPlaceholder}
          value={filters.code ?? ''}
          onChange={(e) => set('code', e.target.value)}
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`filter-toggle ${expanded ? 'filter-toggle-active' : ''}`}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden xs:inline">{expanded ? t.app.hideFilters : t.app.moreFilters}</span>
        </button>
      </div>

      <div className="filter-chips">
        <button
          type="button"
          onClick={() => toggleTransaction('FOR_SALE')}
          className={`filter-chip ${filters.transactionType === 'FOR_SALE' ? 'filter-chip-active' : ''}`}
        >
          {enumLabel('FOR_SALE')}
        </button>
        <button
          type="button"
          onClick={() => toggleTransaction('FOR_RENT')}
          className={`filter-chip ${filters.transactionType === 'FOR_RENT' ? 'filter-chip-active' : ''}`}
        >
          {enumLabel('FOR_RENT')}
        </button>
        {types.slice(0, 3).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={`filter-chip ${filters.propertyType === type ? 'filter-chip-active' : ''}`}
          >
            {enumLabel(type)}
          </button>
        ))}
        {hasActive && (
          <button type="button" onClick={clearAll} className="filter-chip filter-chip-clear">
            <X className="h-3 w-3" />
            {t.app.clearFilters}
          </button>
        )}
      </div>

      {expanded && (
        <div className="filter-expanded">
          <div className="filter-expanded-grid">
            <div>
              <label className="filter-label">{t.filters.neighborhood}</label>
              <select
                className="input-app"
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
              <label className="filter-label">{t.filters.type}</label>
              <select
                className="input-app"
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
              <label className="filter-label">{t.filters.minPrice}</label>
              <input
                type="number"
                className="input-app"
                value={filters.minPrice ?? ''}
                onChange={(e) => set('minPrice', e.target.value)}
              />
            </div>
            <div>
              <label className="filter-label">{t.filters.maxPrice}</label>
              <input
                type="number"
                className="input-app"
                value={filters.maxPrice ?? ''}
                onChange={(e) => set('maxPrice', e.target.value)}
              />
            </div>
            <div>
              <label className="filter-label">{t.filters.minArea}</label>
              <input
                type="number"
                className="input-app"
                value={filters.minArea ?? ''}
                onChange={(e) => set('minArea', e.target.value)}
              />
            </div>
            <div>
              <label className="filter-label">{t.filters.maxArea}</label>
              <input
                type="number"
                className="input-app"
                value={filters.maxArea ?? ''}
                onChange={(e) => set('maxArea', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {resultCount !== undefined && (
        <p className="filter-count">
          {resultCount} {t.app.results}
        </p>
      )}
    </div>
  );
}
