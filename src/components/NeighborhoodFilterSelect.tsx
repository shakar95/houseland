import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useNeighborhoods, getNeighborhoodLabel, getNeighborhoodLabelByName } from '@/hooks/useNeighborhoods';
import { toggleFilterList } from '@/lib/filterUtils';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  inline?: boolean;
};

export function NeighborhoodFilterSelect({ value, onChange, inline }: Props) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  
  const { neighborhoods, error } = useNeighborhoods();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Server returns neighborhoods pre-sorted by property count (most used first).
    // Only apply search filtering; preserve the server's count-based order.
    if (!q) return neighborhoods;
    return neighborhoods.filter((n) => {
      const label = getNeighborhoodLabel(n, lang).toLowerCase();
      return label.includes(q) || n.name.toLowerCase().includes(q);
    });
  }, [search, neighborhoods, lang]);

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
    <div ref={rootRef} className={`neighborhood-select ${inline ? 'neighborhood-select--inline' : ''}`}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-controls="neighborhood-listbox"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`neighborhood-select-trigger cursor-pointer ${open ? 'neighborhood-select-trigger-open' : ''}`}
      >
        <div className="flex flex-1 flex-wrap gap-1.5 min-w-0">
          {value.length === 0 ? (
            <span className="text-sm text-royal-400">{t.filters.selectNeighborhood}</span>
          ) : (
            value.map((v) => {
              const displayLabel = getNeighborhoodLabelByName(v, neighborhoods, lang);
              return (
                <span key={v} className="neighborhood-select-chip" title={displayLabel}>
                  <span className="truncate max-w-[120px]">{displayLabel}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${displayLabel}`}
                    className="neighborhood-select-chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>
        <ChevronDown className={`neighborhood-select-chevron ${open ? 'neighborhood-select-chevron-open' : ''}`} />
      </div>

      {open && (
        <div className={`neighborhood-select-panel ${inline ? 'neighborhood-select-panel--inline' : ''}`}>
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
            {error ? (
              <p className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 text-center rounded-md m-2">
                {error}
              </p>
            ) : (
              <>
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
                      key={n.id}
                      type="button"
                      role="option"
                      aria-selected={value.includes(n.name)}
                      className={`neighborhood-select-option ${value.includes(n.name) ? 'neighborhood-select-option-active' : ''}`}
                      onClick={() => toggle(n.name)}
                    >
                      {getNeighborhoodLabel(n, lang)}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
