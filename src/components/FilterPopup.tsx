import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type FilterPopupProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'default' | 'large';
};

export function FilterPopup({ open, onClose, title, children, size = 'default' }: FilterPopupProps) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setActive(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const onTransitionEnd = () => {
    if (!active) setVisible(false);
  };

  if (!visible) return null;

  return createPortal(
    <div className="filter-popup-root" aria-hidden={!active}>
      <button
        type="button"
        className={`filter-popup-backdrop ${active ? 'filter-popup-backdrop--open' : ''}`}
        onClick={close}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`filter-popup-card ${size === 'large' ? 'filter-popup-card--large' : ''} ${active ? 'filter-popup-card--open' : ''}`}
        onTransitionEnd={onTransitionEnd}
      >
        <h3 className="filter-popup-title">{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}
