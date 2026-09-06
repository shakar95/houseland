import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 380;
const TAP_MOVE_THRESHOLD = 25;

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
  const trackRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef<boolean | null>(null);
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
    if (trackRef.current && scale <= 1) {
      trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
      const offset = rtl ? index * 100 : -index * 100;
      trackRef.current.style.transform = `translate3d(${offset}%, 0, 0)`;
    }
  }, [index, rtl, scale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        const forward = rtl ? -1 : 1;
        onIndexChange(((index + forward % images.length) + images.length) % images.length);
      }
      if (e.key === 'ArrowLeft') {
        const forward = rtl ? 1 : -1;
        onIndexChange(((index + forward % images.length) + images.length) % images.length);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [index, images.length, onClose, onIndexChange, rtl]);

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

  const goTo = useCallback(
    (next: number) => {
      const i = ((next % images.length) + images.length) % images.length;
      onIndexChange(i);
    },
    [images.length, onIndexChange],
  );

  const touchDistance = (touches: React.TouchList) =>
    Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { distance: touchDistance(e.touches), scale: scaleRef.current };
      touchStartRef.current = null;
      isSwipingRef.current = null;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      isSwipingRef.current = null;
      didPanRef.current = false;
      if (scale > 1) {
        panRef.current = {
          x: t.clientX,
          y: t.clientY,
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

    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (scale > 1 && panRef.current) {
        didPanRef.current = true;
        const dx = t.clientX - panRef.current.x;
        const dy = t.clientY - panRef.current.y;
        setPan({ x: panRef.current.panX + dx, y: panRef.current.panY + dy });
        return;
      }

      // scale <= 1: fluid swipe gesture to adjacent images
      if (scale <= 1 && touchStartRef.current && trackRef.current) {
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;

        if (isSwipingRef.current === null) {
          if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
            isSwipingRef.current = Math.abs(dx) > Math.abs(dy);
          }
        }

        if (isSwipingRef.current === true && multi) {
          trackRef.current.style.transition = 'none';
          const baseOffset = rtl ? index * 100 : -index * 100;
          const isAtStart = index === 0 && (rtl ? dx < 0 : dx > 0);
          const isAtEnd = index === images.length - 1 && (rtl ? dx > 0 : dx < 0);
          const effectiveDx = isAtStart || isAtEnd ? dx * 0.25 : dx;
          trackRef.current.style.transform = `translate3d(calc(${baseOffset}% + ${effectiveDx}px), 0, 0)`;
        }
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    pinchRef.current = null;
    panRef.current = null;

    if (e.touches.length > 0) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const wasSwiping = isSwipingRef.current === true;
    isSwipingRef.current = null;

    if (!start) return;

    const endX = e.changedTouches[0]?.clientX ?? start.x;
    const endY = e.changedTouches[0]?.clientY ?? start.y;
    const dx = endX - start.x;
    const dy = endY - start.y;
    const elapsed = Date.now() - start.time;

    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }

    if (scale <= 1 && wasSwiping && multi && trackRef.current) {
      trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
      const isFlick = elapsed < 320 && Math.abs(dx) > 28;
      const isDistance = Math.abs(dx) > 48;

      if (isFlick || isDistance) {
        const forward = rtl ? dx > 0 : dx < 0;
        const nextIndex = forward ? index + 1 : index - 1;
        if (nextIndex >= 0 && nextIndex < images.length) {
          goTo(nextIndex);
          return;
        }
      }
      const baseOffset = rtl ? index * 100 : -index * 100;
      trackRef.current.style.transform = `translate3d(${baseOffset}%, 0, 0)`;
      return;
    }

    // Double tap detection
    const moved = Math.hypot(dx, dy);
    if (moved < TAP_MOVE_THRESHOLD) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        toggleZoom();
      } else {
        lastTapRef.current = now;
      }
    }
  };

  const onTouchCancel = () => {
    touchStartRef.current = null;
    isSwipingRef.current = null;
    pinchRef.current = null;
    panRef.current = null;
    if (trackRef.current && scale <= 1) {
      trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
      const baseOffset = rtl ? index * 100 : -index * 100;
      trackRef.current.style.transform = `translate3d(${baseOffset}%, 0, 0)`;
    }
  };

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.2 : -0.2);
  };

  const slideOffset = rtl ? index * 100 : -index * 100;

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
        onTouchCancel={onTouchCancel}
        onWheel={onWheel}
        onDoubleClick={toggleZoom}
      >
        <div
          ref={trackRef}
          className="property-lightbox-track"
          style={{ transform: `translate3d(${slideOffset}%, 0, 0)` }}
        >
          {images.map((imgSrc, i) => (
            <div key={`${imgSrc}-${i}`} className="property-lightbox-slide">
              <div
                className="property-lightbox-zoom-layer"
                style={{
                  transform:
                    i === index
                      ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`
                      : 'translate3d(0, 0, 0) scale(1)',
                  transition:
                    i === index && (didPanRef.current || pinchRef.current)
                      ? 'none'
                      : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <img
                  src={imgSrc}
                  alt={i === index ? alt : ''}
                  className="property-lightbox-image"
                  draggable={false}
                  loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
