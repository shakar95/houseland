import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { SULAYMANIYAH_NEIGHBORHOODS } from '@/lib/neighborhoods';
import { formatFilterListLabel, toggleFilterList } from '@/lib/filterUtils';
import { useLanguage } from '@/context/LanguageContext';

const sortedNeighborhoods = [...SULAYMANIYAH_NEIGHBORHOODS].sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' }),
);

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export function NeighborhoodFilterSelect({ value, onChange }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedNeighborhoods;
    return sortedNeighborhoods.filter((n) => n.toLowerCase().includes(q));
  }, [search]);

  const triggerLabel = formatFilterListLabel(value, t.filters.selectNeighborhood);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (name: string) => {
    onChange(toggleFilterList(value, name));
  };

  return (
    <div ref={rootRef} className="neighborhood-select">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`neighborhood-select-trigger ${open ? 'neighborhood-select-trigger-open' : ''}`}
      >
        <span className="neighborhood-select-trigger-label">{triggerLabel}</span>
        <ChevronDown className={`neighborhood-select-chevron ${open ? 'neighborhood-select-chevron-open' : ''}`} />
      </button>

      {open && (
        <div className="neighborhood-select-panel">
          <div className="neighborhood-select-search-wrap">
            <Search className="neighborhood-select-search-icon" />
            <input
              type="search"
              className="neighborhood-select-search"
              placeholder={t.filters.searchNeighborhood}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="neighborhood-select-box" role="listbox" aria-multiselectable="true">
            <button
              type="button"
              role="option"
              aria-selected={value.length === 0}
              className={`neighborhood-select-option ${value.length === 0 ? 'neighborhood-select-option-active' : ''}`}
              onClick={() => onChange([])}
            >
              {t.filters.allAreas}
            </button>
            {filtered.length === 0 ? (
              <p className="neighborhood-select-empty">{t.filters.noNeighborhoodMatch}</p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="option"
                  aria-selected={value.includes(n)}
                  className={`neighborhood-select-option ${value.includes(n) ? 'neighborhood-select-option-active' : ''}`}
                  onClick={() => toggle(n)}
                >
                  {n}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
