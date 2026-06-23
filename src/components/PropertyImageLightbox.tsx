import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 400;
const TAP_MOVE_THRESHOLD = 18;

type Props = {
  images: string[];
  index: number;
  alt: string;
  initialScale?: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function PropertyImageLightbox({
  images,
  index,
  alt,
  initialScale = 1,
  onClose,
  onIndexChange,
}: Props) {
  const { rtl, t } = useLanguage();
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const didPanRef = useRef(false);
  const scaleRef = useRef(initialScale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const multi = images.length > 1;

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    pinchRef.current = null;
    panRef.current = null;
    didPanRef.current = false;
  }, []);

  const prevIndexRef = useRef(index);
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      resetView();
      prevIndexRef.current = index;
    }
  }, [index, resetView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const zoomBy = (delta: number) => {
    setScale((current) => {
      const next = clampScale(current + delta);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const toggleZoom = useCallback(() => {
    setScale((current) => {
      if (current > 1.05) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  }, []);

  const goTo = (next: number) => {
    const i = ((next % images.length) + images.length) % images.length;
    onIndexChange(i);
  };

  const touchDistance = (touches: React.TouchList) =>
    Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { distance: touchDistance(e.touches), scale: scaleRef.current };
      touchStartRef.current = null;
      return;
    }
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      didPanRef.current = false;
      if (scale > 1) {
        panRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: pan.x,
          panY: pan.y,
        };
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const distance = touchDistance(e.touches);
      const next = clampScale(pinchRef.current.scale * (distance / pinchRef.current.distance));
      setScale(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return;
    }
    if (e.touches.length === 1 && panRef.current && scale > 1) {
      didPanRef.current = true;
      const dx = e.touches[0].clientX - panRef.current.x;
      const dy = e.touches[0].clientY - panRef.current.y;
      setPan({ x: panRef.current.panX + dx, y: panRef.current.panY + dy });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    pinchRef.current = null;
    panRef.current = null;

    if (e.touches.length > 0) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = start.x - endX;
    const dy = start.y - endY;
    const moved = Math.hypot(dx, dy);

    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }

    if (multi && scale <= 1 && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      const forward = rtl ? dx < 0 : dx > 0;
      goTo(index + (forward ? 1 : -1));
      return;
    }

    if (moved > TAP_MOVE_THRESHOLD) return;

    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      toggleZoom();
    } else {
      lastTapRef.current = now;
    }
  };

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.2 : -0.2);
  };

  return (
    <div
      className="property-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t.property.photoFullscreen}
      onClick={onBackdropClick}
    >
      <div className="property-lightbox-toolbar">
        {multi && (
          <span className="property-lightbox-counter">
            {index + 1} / {images.length}
          </span>
        )}
        <div className="property-lightbox-zoom-actions">
          <button
            type="button"
            className="property-lightbox-btn"
            onClick={() => zoomBy(-0.5)}
            aria-label={t.property.photoZoomOut}
            disabled={scale <= MIN_SCALE}
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="property-lightbox-btn"
            onClick={() => zoomBy(0.5)}
            aria-label={t.property.photoZoomIn}
            disabled={scale >= MAX_SCALE}
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="property-lightbox-btn"
            onClick={onClose}
            aria-label={t.property.photoClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {multi && scale <= 1 && (
        <>
          <button
            type="button"
            className="property-lightbox-nav property-lightbox-nav-prev"
            onClick={() => goTo(index - 1)}
            aria-label={t.property.photoPrev}
          >
            <PrevIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="property-lightbox-nav property-lightbox-nav-next"
            onClick={() => goTo(index + 1)}
            aria-label={t.property.photoNext}
          >
            <NextIcon className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="property-lightbox-stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onDoubleClick={toggleZoom}
      >
        <div
          className="property-lightbox-zoom-layer"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          <img
            src={images[index]}
            alt={alt}
            className="property-lightbox-image"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
