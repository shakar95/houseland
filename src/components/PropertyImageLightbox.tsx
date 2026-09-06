import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VideoEmbed } from '@/components/VideoEmbed';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MAX_DELAY = 450;
const TAP_MAX_DISPLACEMENT = 32;

export type ImageSlide = { type: 'image'; src: string; key: string };
export type VideoSlide = { type: 'video'; url: string; key: string };
export type Slide = ImageSlide | VideoSlide;

type Props = {
  slides: Slide[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function PropertyImageLightbox({
  slides,
  index,
  alt,
  onClose,
  onIndexChange,
}: Props) {
  const { rtl, t } = useLanguage();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const trackRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isPanningRef = useRef(false);
  const isSwipingRef = useRef<boolean | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const multi = slides.length > 1;
  const isCurrentImage = slides[index]?.type === 'image';

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    pinchRef.current = null;
    panStartRef.current = null;
    isPanningRef.current = false;
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
        onIndexChange(((index + forward % slides.length) + slides.length) % slides.length);
      }
      if (e.key === 'ArrowLeft') {
        const forward = rtl ? 1 : -1;
        onIndexChange(((index + forward % slides.length) + slides.length) % slides.length);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [index, slides.length, onClose, onIndexChange, rtl]);

  const zoomBy = (delta: number) => {
    if (!isCurrentImage) return;
    setScale((current) => {
      const next = clampScale(current + delta);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const toggleZoom = useCallback(() => {
    if (!isCurrentImage) return;
    setScale((current) => {
      if (current > 1.05) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      setPan({ x: 0, y: 0 });
      return 2.5;
    });
  }, [isCurrentImage]);

  const goTo = useCallback(
    (next: number) => {
      const i = ((next % slides.length) + slides.length) % slides.length;
      onIndexChange(i);
    },
    [slides.length, onIndexChange],
  );

  const touchDistance = (touches: React.TouchList) =>
    Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isCurrentImage) {
      pinchRef.current = { distance: touchDistance(e.touches), scale };
      touchStartRef.current = null;
      isSwipingRef.current = null;
      isPanningRef.current = false;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      isSwipingRef.current = null;
      isPanningRef.current = false;
      panStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current && isCurrentImage) {
      const distance = touchDistance(e.touches);
      const next = clampScale(pinchRef.current.scale * (distance / pinchRef.current.distance));
      setScale(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length === 1 && touchStartRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const dist = Math.hypot(dx, dy);

      // If zoomed in on image: pan when moved > 8px
      if (scale > 1 && panStartRef.current && isCurrentImage) {
        if (dist > 8) {
          isPanningRef.current = true;
          setPan({
            x: panStartRef.current.panX + dx,
            y: panStartRef.current.panY + dy,
          });
        }
        return;
      }

      // If unzoomed (scale <= 1): swipe carousel slides smoothly
      if (scale <= 1 && trackRef.current && multi) {
        if (isSwipingRef.current === null) {
          if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
            isSwipingRef.current = Math.abs(dx) > Math.abs(dy);
          }
        }

        if (isSwipingRef.current === true) {
          trackRef.current.style.transition = 'none';
          const baseOffset = rtl ? index * 100 : -index * 100;
          const isAtStart = index === 0 && (rtl ? dx < 0 : dx > 0);
          const isAtEnd = index === slides.length - 1 && (rtl ? dx > 0 : dx < 0);
          const effectiveDx = isAtStart || isAtEnd ? dx * 0.25 : dx;
          trackRef.current.style.transform = `translate3d(calc(${baseOffset}% + ${effectiveDx}px), 0, 0)`;
        }
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    pinchRef.current = null;
    panStartRef.current = null;

    if (e.touches.length > 0) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const wasSwiping = isSwipingRef.current === true;
    const wasPanning = isPanningRef.current;
    isSwipingRef.current = null;
    isPanningRef.current = false;

    if (!start) return;

    const endX = e.changedTouches[0]?.clientX ?? start.x;
    const endY = e.changedTouches[0]?.clientY ?? start.y;
    const dx = endX - start.x;
    const dy = endY - start.y;
    const dist = Math.hypot(dx, dy);
    const elapsed = Date.now() - start.time;

    // 1. Double tap detection (displacement < 32px)
    if (dist < TAP_MAX_DISPLACEMENT && isCurrentImage) {
      const now = Date.now();
      if (
        lastTapRef.current &&
        now - lastTapRef.current.time < DOUBLE_TAP_MAX_DELAY &&
        now - lastTapRef.current.time > 40 &&
        Math.hypot(endX - lastTapRef.current.x, endY - lastTapRef.current.y) < 55
      ) {
        lastTapRef.current = null;
        toggleZoom();
        return;
      }
      lastTapRef.current = { time: now, x: endX, y: endY };
      return;
    }

    // 2. If zoomed in and was panning: don't slide slides
    if (scale > 1 || wasPanning) {
      return;
    }

    // 3. If unzoomed (scale <= 1) and was swiping: slide carousel
    if (wasSwiping && multi && trackRef.current) {
      trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
      const isFlick = elapsed < 320 && Math.abs(dx) > 28;
      const isDistance = Math.abs(dx) > 42;

      if (isFlick || isDistance) {
        const forward = rtl ? dx > 0 : dx < 0;
        const nextIndex = forward ? index + 1 : index - 1;
        if (nextIndex >= 0 && nextIndex < slides.length) {
          goTo(nextIndex);
          return;
        }
      }
      const baseOffset = rtl ? index * 100 : -index * 100;
      trackRef.current.style.transform = `translate3d(${baseOffset}%, 0, 0)`;
    }
  };

  const onTouchCancel = () => {
    touchStartRef.current = null;
    isSwipingRef.current = null;
    pinchRef.current = null;
    panStartRef.current = null;
    isPanningRef.current = false;
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
    if (!isCurrentImage) return;
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
          <span className="property-lightbox-counter font-semibold">
            {index + 1} / {slides.length}
          </span>
        )}
        <div className="property-lightbox-zoom-actions">
          {isCurrentImage && (
            <>
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
            </>
          )}
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

      {/* Prominent side navigation arrows - always visible when multiple slides and unzoomed */}
      {multi && scale <= 1 && (
        <>
          <button
            type="button"
            className="property-lightbox-nav property-lightbox-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            aria-label={t.property.photoPrev}
          >
            <PrevIcon className="h-6 w-6 text-white" />
          </button>
          <button
            type="button"
            className="property-lightbox-nav property-lightbox-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            aria-label={t.property.photoNext}
          >
            <NextIcon className="h-6 w-6 text-white" />
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
          {slides.map((slide, i) =>
            slide.type === 'image' ? (
              <div key={slide.key} className="property-lightbox-slide">
                <div
                  className="property-lightbox-zoom-layer"
                  style={{
                    transform:
                      i === index
                        ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`
                        : 'translate3d(0, 0, 0) scale(1)',
                    transition:
                      i === index && (isPanningRef.current || pinchRef.current)
                        ? 'none'
                        : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <img
                    src={slide.src}
                    alt={i === index ? alt : ''}
                    className="property-lightbox-image"
                    draggable={false}
                    loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
                  />
                </div>
              </div>
            ) : (
              <div key={slide.key} className="property-lightbox-slide">
                <div className="w-full h-full max-w-4xl max-h-[85vh] mx-auto flex items-center justify-center pointer-events-auto">
                  <VideoEmbed url={slide.url} aspect="reel" autoPlay={false} />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
