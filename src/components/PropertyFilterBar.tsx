import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { FilterPopup } from '@/components/FilterPopup';
import { NeighborhoodFilterSelect } from '@/components/NeighborhoodFilterSelect';
import {
  formatFilterListLabel,
  joinFilterList,
  parseFilterList,
  toggleFilterList,
} from '@/lib/filterUtils';
import { useLanguage } from '@/context/LanguageContext';
import type { PropertyFilters } from '@/types';

interface Props {
  filters: PropertyFilters;
  onChange: (f: PropertyFilters) => void;
  resultCount?: number;
}

type PopupKey = 'type' | 'neighborhood' | 'price' | 'area';

const types = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'] as const;
const quickTransactionFilters = ['FOR_SALE', 'FOR_RENT'] as const;
const transactionFilters = ['FOR_SALE', 'FOR_RENT', 'FOR_EXCHANGE'] as const;

type DraftFilters = {
  transactionTypes: string[];
  propertyTypes: string[];
  neighborhoods: string[];
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
};

function toDraft(filters: PropertyFilters): DraftFilters {
  return {
    transactionTypes: parseFilterList(filters.transactionType),
    propertyTypes: parseFilterList(filters.propertyType),
    neighborhoods: parseFilterList(filters.neighborhood),
    minPrice: filters.minPrice ?? '',
    maxPrice: filters.maxPrice ?? '',
    minArea: filters.minArea ?? '',
    maxArea: filters.maxArea ?? '',
  };
}

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
  const [modalOpen, setModalOpen] = useState(false);
  const [popup, setPopup] = useState<PopupKey | null>(null);
  const [draft, setDraft] = useState<DraftFilters>(() => toDraft(filters));
  const [popupTypes, setPopupTypes] = useState<string[]>([]);
  const [popupNeighborhoods, setPopupNeighborhoods] = useState<string[]>([]);
  const [draftMinPrice, setDraftMinPrice] = useState('');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [draftMinArea, setDraftMinArea] = useState('');
  const [draftMaxArea, setDraftMaxArea] = useState('');

  const selectedTypes = parseFilterList(filters.propertyType);
  const selectedNeighborhoods = parseFilterList(filters.neighborhood);
  const selectedTransactions = parseFilterList(filters.transactionType);
  const transactionActive = selectedTransactions.length > 0;
  const typeActive = selectedTypes.length > 0;
  const neighborhoodActive = selectedNeighborhoods.length > 0;
  const priceActive = Boolean(filters.minPrice || filters.maxPrice);
  const areaActive = Boolean(filters.minArea || filters.maxArea);
  const hasSecondaryFilters =
    transactionActive || typeActive || neighborhoodActive || priceActive || areaActive;

  useEffect(() => {
    if (popup === 'type') setPopupTypes(parseFilterList(filters.propertyType));
    if (popup === 'neighborhood') setPopupNeighborhoods(parseFilterList(filters.neighborhood));
    if (popup === 'price') {
      setDraftMinPrice(filters.minPrice ?? '');
      setDraftMaxPrice(filters.maxPrice ?? '');
    }
    if (popup === 'area') {
      setDraftMinArea(filters.minArea ?? '');
      setDraftMaxArea(filters.maxArea ?? '');
    }
  }, [
    popup,
    filters.propertyType,
    filters.neighborhood,
    filters.minPrice,
    filters.maxPrice,
    filters.minArea,
    filters.maxArea,
  ]);

  const setListFilter = (key: 'propertyType' | 'neighborhood' | 'transactionType', values: string[]) => {
    const joined = joinFilterList(values);
    const next = { ...filters };
    if (joined) next[key] = joined;
    else delete next[key];
    onChange(next);
  };

  const setScalar = (key: keyof PropertyFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const toggleTransaction = (value: (typeof quickTransactionFilters)[number]) => {
    setListFilter('transactionType', toggleFilterList(selectedTransactions, value));
  };

  const openModal = () => {
    setDraft(toDraft(filters));
    setModalOpen(true);
  };

  const applyDraft = () => {
    const next: PropertyFilters = { ...filters };
    const transactionValue = joinFilterList(draft.transactionTypes);
    const typeValue = joinFilterList(draft.propertyTypes);
    const neighborhoodValue = joinFilterList(draft.neighborhoods);
    if (transactionValue) next.transactionType = transactionValue;
    else delete next.transactionType;
    if (typeValue) next.propertyType = typeValue;
    else delete next.propertyType;
    if (neighborhoodValue) next.neighborhood = neighborhoodValue;
    else delete next.neighborhood;
    next.minPrice = draft.minPrice;
    next.maxPrice = draft.maxPrice;
    next.minArea = draft.minArea;
    next.maxArea = draft.maxArea;
    onChange(next);
    setModalOpen(false);
  };

  const clearDraft = () => {
    setDraft({
      transactionTypes: [],
      propertyTypes: [],
      neighborhoods: [],
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
    });
  };

  const clearSecondaryFilters = () => {
    onChange({
      ...filters,
      transactionType: undefined,
      propertyType: undefined,
      neighborhood: undefined,
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
    });
  };

  const typeLabel = formatFilterListLabel(selectedTypes, t.filters.type, enumLabel);
  const neighborhoodLabel = formatFilterListLabel(
    selectedNeighborhoods,
    t.filters.neighborhood,
  );
  const priceLabel = priceActive
    ? `${filters.minPrice || '0'}, ${filters.maxPrice || '∞'}`
    : t.filters.priceShort;
  const areaLabel = areaActive
    ? `${filters.minArea || '0'}, ${filters.maxArea || '∞'} m²`
    : t.filters.areaShort;

  const applyPopupTypes = () => {
    setListFilter('propertyType', popupTypes);
    setPopup(null);
  };

  const applyPopupNeighborhoods = () => {
    setListFilter('neighborhood', popupNeighborhoods);
    setPopup(null);
  };

  const applyPrice = () => {
    onChange({ ...filters, minPrice: draftMinPrice, maxPrice: draftMaxPrice });
    setPopup(null);
  };

  const applyArea = () => {
    onChange({ ...filters, minArea: draftMinArea, maxArea: draftMaxArea });
    setPopup(null);
  };

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <input
          type="search"
          className="filter-search"
          placeholder={t.app.searchPlaceholder}
          value={filters.code ?? ''}
          onChange={(e) => setScalar('code', e.target.value)}
        />
        {quickTransactionFilters.map((tx) => (
          <button
            key={tx}
            type="button"
            onClick={() => toggleTransaction(tx)}
            className={`filter-transaction-btn ${selectedTransactions.includes(tx) ? 'filter-transaction-btn-active' : ''}`}
          >
            {enumLabel(tx)}
          </button>
        ))}
        <button
          type="button"
          onClick={openModal}
          className={`filter-toggle ${hasSecondaryFilters ? 'filter-toggle-active' : ''}`}
          aria-expanded={modalOpen}
          aria-label={t.app.moreFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="filter-pills">
        <FilterPill
          label={typeLabel}
          active={typeActive}
          onOpen={() => setPopup('type')}
          onClear={() => setListFilter('propertyType', [])}
        />
        <FilterPill
          label={priceLabel}
          active={priceActive}
          onOpen={() => setPopup('price')}
          onClear={() => onChange({ ...filters, minPrice: '', maxPrice: '' })}
        />
        <FilterPill
          label={areaLabel}
          active={areaActive}
          onOpen={() => setPopup('area')}
          onClear={() => onChange({ ...filters, minArea: '', maxArea: '' })}
        />
        <FilterPill
          label={neighborhoodLabel}
          active={neighborhoodActive}
          onOpen={() => setPopup('neighborhood')}
          onClear={() => setListFilter('neighborhood', [])}
        />
      </div>

      <FilterPopup open={popup === 'type'} onClose={() => setPopup(null)} title={t.filters.type}>
        <div className="filter-popup-list">
          {types.map((type) => (
            <button
              key={type}
              type="button"
              className={`filter-popup-option ${popupTypes.includes(type) ? 'filter-popup-option-active' : ''}`}
              onClick={() => setPopupTypes((prev) => toggleFilterList(prev, type))}
            >
              {enumLabel(type)}
            </button>
          ))}
        </div>
        <button type="button" onClick={applyPopupTypes} className="btn-gold mt-4 w-full">
          {t.filters.apply}
        </button>
      </FilterPopup>

      <FilterPopup
        open={popup === 'neighborhood'}
        onClose={() => setPopup(null)}
        title={t.filters.neighborhood}
      >
        <NeighborhoodFilterSelect value={popupNeighborhoods} onChange={setPopupNeighborhoods} />
        <button type="button" onClick={applyPopupNeighborhoods} className="btn-gold mt-4 w-full">
          {t.filters.apply}
        </button>
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

      <FilterPopup
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.app.moreFilters}
        size="large"
      >
        <div className="filter-sheet">
          <section className="filter-sheet-section">
            <h4 className="filter-sheet-heading">{t.filters.transaction}</h4>
            <div className="filter-sheet-chips">
              {transactionFilters.map((tx) => (
                <button
                  key={tx}
                  type="button"
                  className={`filter-chip ${draft.transactionTypes.includes(tx) ? 'filter-chip-active' : ''}`}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      transactionTypes: toggleFilterList(prev.transactionTypes, tx),
                    }))
                  }
                >
                  {enumLabel(tx)}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-sheet-section">
            <h4 className="filter-sheet-heading">{t.filters.type}</h4>
            <div className="filter-sheet-chips">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`filter-chip ${draft.propertyTypes.includes(type) ? 'filter-chip-active' : ''}`}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      propertyTypes: toggleFilterList(prev.propertyTypes, type),
                    }))
                  }
                >
                  {enumLabel(type)}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-sheet-section">
            <h4 className="filter-sheet-heading">{t.filters.neighborhood}</h4>
            <NeighborhoodFilterSelect
              value={draft.neighborhoods}
              onChange={(neighborhoods) => setDraft((prev) => ({ ...prev, neighborhoods }))}
            />
          </section>

          <section className="filter-sheet-section">
            <h4 className="filter-sheet-heading">{t.filters.priceShort}</h4>
            <div className="filter-sheet-range">
              <div>
                <label className="filter-label">{t.filters.minPrice}</label>
                <input
                  type="number"
                  className="input-app"
                  placeholder="0"
                  value={draft.minPrice}
                  onChange={(e) => setDraft((prev) => ({ ...prev, minPrice: e.target.value }))}
                />
              </div>
              <div>
                <label className="filter-label">{t.filters.maxPrice}</label>
                <input
                  type="number"
                  className="input-app"
                  placeholder="∞"
                  value={draft.maxPrice}
                  onChange={(e) => setDraft((prev) => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="filter-sheet-section">
            <h4 className="filter-sheet-heading">{t.filters.areaShort}</h4>
            <div className="filter-sheet-range">
              <div>
                <label className="filter-label">{t.filters.minArea}</label>
                <input
                  type="number"
                  className="input-app"
                  placeholder="0"
                  value={draft.minArea}
                  onChange={(e) => setDraft((prev) => ({ ...prev, minArea: e.target.value }))}
                />
              </div>
              <div>
                <label className="filter-label">{t.filters.maxArea}</label>
                <input
                  type="number"
                  className="input-app"
                  placeholder="∞"
                  value={draft.maxArea}
                  onChange={(e) => setDraft((prev) => ({ ...prev, maxArea: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <div className="filter-sheet-actions">
            <button type="button" onClick={clearDraft} className="btn-outline-gold flex-1 text-sm">
              {t.app.clearFilters}
            </button>
            <button type="button" onClick={applyDraft} className="btn-gold flex-1 text-sm">
              {t.filters.apply}
            </button>
          </div>
        </div>
      </FilterPopup>

      {resultCount !== undefined && (
        <p className="filter-count">
          {resultCount} {t.app.results}
          {hasSecondaryFilters && (
            <button type="button" onClick={clearSecondaryFilters} className="ms-2 text-gold-400 underline">
              {t.app.clearFilters}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
