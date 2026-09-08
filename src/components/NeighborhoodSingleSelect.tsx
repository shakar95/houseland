import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useNeighborhoods, getNeighborhoodLabel, getNeighborhoodLabelByName } from '@/hooks/useNeighborhoods';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
};

export function NeighborhoodSingleSelect({ value, onChange, placeholder, className = '' }: Props) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  
  const { neighborhoods } = useNeighborhoods();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Server returns neighborhoods pre-sorted by property count (most used first).
    if (!q) return neighborhoods;
    return neighborhoods.filter((n) => {
      const label = getNeighborhoodLabel(n, lang).toLowerCase();
      return label.includes(q) || n.name.toLowerCase().includes(q);
    });
  }, [search, neighborhoods, lang]);

  const triggerLabel = value && value !== 'all'
    ? getNeighborhoodLabelByName(value, neighborhoods, lang)
    : placeholder || t.filters.selectNeighborhood;

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

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={rootRef} className={`neighborhood-select ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`neighborhood-select-trigger ${open ? 'neighborhood-select-trigger-open' : ''} ${className.includes('input-luxury') ? 'h-11 w-full text-start px-3 bg-royal-800/50 border border-royal-700/50 rounded-xl' : ''}`}
      >
        <span className="neighborhood-select-trigger-label truncate">{triggerLabel}</span>
        <ChevronDown className={`neighborhood-select-chevron ${open ? 'neighborhood-select-chevron-open' : ''}`} />
      </button>

      {open && (
        <div className="neighborhood-select-panel z-50">
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

          <div className="neighborhood-select-box" role="listbox">
            {placeholder && (
              <button
                type="button"
                role="option"
                aria-selected={!value || value === 'all'}
                className={`neighborhood-select-option ${(!value || value === 'all') ? 'neighborhood-select-option-active' : ''}`}
                onClick={() => select(placeholder === t.filters.allAreas ? 'all' : '')}
              >
                {placeholder}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="neighborhood-select-empty">{t.filters.noNeighborhoodMatch}</p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="option"
                  aria-selected={value === n.name}
                  className={`neighborhood-select-option ${value === n.name ? 'neighborhood-select-option-active' : ''}`}
                  onClick={() => select(n.name)}
                >
                  {getNeighborhoodLabel(n, lang)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
