import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { FilterPopup } from '@/components/FilterPopup';
import { SULAYMANIYAH_NEIGHBORHOODS } from '@/lib/neighborhoods';
import { useLanguage } from '@/context/LanguageContext';
import type { PropertyFilters } from '@/types';

interface Props {
  filters: PropertyFilters;
  onChange: (f: PropertyFilters) => void;
  resultCount?: number;
}

type PopupKey = 'type' | 'neighborhood' | 'price' | 'area';

const types = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'] as const;

function FilterPill({
  label,
  active,
  onOpen,
  onClear,
}: {
  label: string;
  active: boolean;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`filter-pill ${active ? 'filter-pill-active' : ''}`}
    >
      <span className="filter-pill-label">{label}</span>
      {active && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear"
          className="filter-pill-clear"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }
          }}
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

export function PropertyFilterBar({ filters, onChange, resultCount }: Props) {
  const { t, enumLabel } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const [popup, setPopup] = useState<PopupKey | null>(null);
  const [draftMinPrice, setDraftMinPrice] = useState('');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [draftMinArea, setDraftMinArea] = useState('');
  const [draftMaxArea, setDraftMaxArea] = useState('');

  const set = (key: keyof PropertyFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const toggleTransaction = (value: string) => {
    const current = filters.transactionType ?? 'all';
    set('transactionType', current === value ? 'all' : value);
  };

  const typeActive = Boolean(filters.propertyType && filters.propertyType !== 'all');
  const neighborhoodActive = Boolean(filters.neighborhood && filters.neighborhood !== 'all');
  const priceActive = Boolean(filters.minPrice || filters.maxPrice);
  const areaActive = Boolean(filters.minArea || filters.maxArea);

  const hasSecondaryFilters = typeActive || neighborhoodActive || priceActive || areaActive;

  useEffect(() => {
    if (popup === 'price') {
      setDraftMinPrice(filters.minPrice ?? '');
      setDraftMaxPrice(filters.maxPrice ?? '');
    }
    if (popup === 'area') {
      setDraftMinArea(filters.minArea ?? '');
      setDraftMaxArea(filters.maxArea ?? '');
    }
  }, [popup, filters.minPrice, filters.maxPrice, filters.minArea, filters.maxArea]);

  const typeLabel = typeActive ? enumLabel(filters.propertyType!) : t.filters.type;
  const neighborhoodLabel = neighborhoodActive ? filters.neighborhood! : t.filters.neighborhood;

  const priceLabel = priceActive
    ? `${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`
    : t.filters.priceShort;

  const areaLabel = areaActive
    ? `${filters.minArea || '0'} – ${filters.maxArea || '∞'} m²`
    : t.filters.areaShort;

  const applyPrice = () => {
    onChange({ ...filters, minPrice: draftMinPrice, maxPrice: draftMaxPrice });
    setPopup(null);
  };

  const applyArea = () => {
    onChange({ ...filters, minArea: draftMinArea, maxArea: draftMaxArea });
    setPopup(null);
  };

  const clearType = () => set('propertyType', 'all');
  const clearNeighborhood = () => set('neighborhood', 'all');
  const clearPrice = () => onChange({ ...filters, minPrice: '', maxPrice: '' });
  const clearArea = () => onChange({ ...filters, minArea: '', maxArea: '' });

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
          onClick={() => toggleTransaction('FOR_SALE')}
          className={`filter-transaction-btn ${filters.transactionType === 'FOR_SALE' ? 'filter-transaction-btn-active' : ''}`}
        >
          {enumLabel('FOR_SALE')}
        </button>
        <button
          type="button"
          onClick={() => toggleTransaction('FOR_RENT')}
          className={`filter-transaction-btn ${filters.transactionType === 'FOR_RENT' ? 'filter-transaction-btn-active' : ''}`}
        >
          {enumLabel('FOR_RENT')}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`filter-toggle ${expanded || hasSecondaryFilters ? 'filter-toggle-active' : ''}`}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden xs:inline">{expanded ? t.app.hideFilters : t.app.moreFilters}</span>
        </button>
      </div>

      {expanded && (
        <div className="filter-pills">
          <FilterPill
            label={typeLabel}
            active={typeActive}
            onOpen={() => setPopup('type')}
            onClear={clearType}
          />
          <FilterPill
            label={neighborhoodLabel}
            active={neighborhoodActive}
            onOpen={() => setPopup('neighborhood')}
            onClear={clearNeighborhood}
          />
          <FilterPill
            label={priceLabel}
            active={priceActive}
            onOpen={() => setPopup('price')}
            onClear={clearPrice}
          />
          <FilterPill
            label={areaLabel}
            active={areaActive}
            onOpen={() => setPopup('area')}
            onClear={clearArea}
          />
        </div>
      )}

      <FilterPopup open={popup === 'type'} onClose={() => setPopup(null)} title={t.filters.type}>
        <div className="filter-popup-list">
          <button
            type="button"
            className={`filter-popup-option ${!typeActive ? 'filter-popup-option-active' : ''}`}
            onClick={() => {
              clearType();
              setPopup(null);
            }}
          >
            {t.filters.allTypes}
          </button>
          {types.map((type) => (
            <button
              key={type}
              type="button"
              className={`filter-popup-option ${filters.propertyType === type ? 'filter-popup-option-active' : ''}`}
              onClick={() => {
                set('propertyType', type);
                setPopup(null);
              }}
            >
              {enumLabel(type)}
            </button>
          ))}
        </div>
      </FilterPopup>

      <FilterPopup
        open={popup === 'neighborhood'}
        onClose={() => setPopup(null)}
        title={t.filters.neighborhood}
      >
        <div className="filter-popup-list filter-popup-list-scroll">
          <button
            type="button"
            className={`filter-popup-option ${!neighborhoodActive ? 'filter-popup-option-active' : ''}`}
            onClick={() => {
              clearNeighborhood();
              setPopup(null);
            }}
          >
            {t.filters.allAreas}
          </button>
          {SULAYMANIYAH_NEIGHBORHOODS.map((n) => (
            <button
              key={n}
              type="button"
              className={`filter-popup-option ${filters.neighborhood === n ? 'filter-popup-option-active' : ''}`}
              onClick={() => {
                set('neighborhood', n);
                setPopup(null);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </FilterPopup>

      <FilterPopup open={popup === 'price'} onClose={() => setPopup(null)} title={t.filters.priceShort}>
        <div className="filter-popup-form">
          <label className="filter-label">{t.filters.minPrice}</label>
          <input
            type="number"
            className="input-app"
            placeholder="0"
            value={draftMinPrice}
            onChange={(e) => setDraftMinPrice(e.target.value)}
          />
          <label className="filter-label mt-3">{t.filters.maxPrice}</label>
          <input
            type="number"
            className="input-app"
            placeholder="∞"
            value={draftMaxPrice}
            onChange={(e) => setDraftMaxPrice(e.target.value)}
          />
          <button type="button" onClick={applyPrice} className="btn-gold mt-4 w-full">
            {t.filters.apply}
          </button>
        </div>
      </FilterPopup>

      <FilterPopup open={popup === 'area'} onClose={() => setPopup(null)} title={t.filters.areaShort}>
        <div className="filter-popup-form">
          <label className="filter-label">{t.filters.minArea}</label>
          <input
            type="number"
            className="input-app"
            placeholder="0"
            value={draftMinArea}
            onChange={(e) => setDraftMinArea(e.target.value)}
          />
          <label className="filter-label mt-3">{t.filters.maxArea}</label>
          <input
            type="number"
            className="input-app"
            placeholder="∞"
            value={draftMaxArea}
            onChange={(e) => setDraftMaxArea(e.target.value)}
          />
          <button type="button" onClick={applyArea} className="btn-gold mt-4 w-full">
            {t.filters.apply}
          </button>
        </div>
      </FilterPopup>

      {resultCount !== undefined && (
        <p className="filter-count">
          {resultCount} {t.app.results}
        </p>
      )}
    </div>
  );
}
