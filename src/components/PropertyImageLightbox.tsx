import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VideoEmbed } from '@/components/VideoEmbed';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MAX_DELAY = 380;
const DOUBLE_TAP_MIN_DELAY = 40;
const DOUBLE_TAP_MAX_DISTANCE = 60;
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
  const lightboxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isPanningRef = useRef(false);
  const gestureModeRef = useRef<'horizontal' | 'vertical' | null>(null);
  const isDoubleTappingRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastZoomToggleTimeRef = useRef(0);

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
    isDoubleTappingRef.current = false;
    gestureModeRef.current = null;
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
    const now = Date.now();
    if (now - lastZoomToggleTimeRef.current < 450) {
      return;
    }
    lastZoomToggleTimeRef.current = now;

    setScale((current) => {
      if (current > 1.05) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      setPan({ x: 0, y: 0 });
      return 2.4;
    });
  }, [isCurrentImage]);

  const onDoubleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastZoomToggleTimeRef.current < 500) {
      return;
    }
    toggleZoom();
  }, [toggleZoom]);

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
      gestureModeRef.current = null;
      isPanningRef.current = false;
      isDoubleTappingRef.current = false;
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();

      // Double-tap triggered right on touch-start of 2nd tap
      if (
        isCurrentImage &&
        lastTapRef.current &&
        now - lastTapRef.current.time < DOUBLE_TAP_MAX_DELAY &&
        now - lastTapRef.current.time > DOUBLE_TAP_MIN_DELAY &&
        Math.hypot(t.clientX - lastTapRef.current.x, t.clientY - lastTapRef.current.y) < DOUBLE_TAP_MAX_DISTANCE
      ) {
        lastTapRef.current = null;
        isDoubleTappingRef.current = true;
        touchStartRef.current = null;
        gestureModeRef.current = null;
        isPanningRef.current = false;
        toggleZoom();
        return;
      }

      isDoubleTappingRef.current = false;
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: now };
      gestureModeRef.current = null;
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
    if (isDoubleTappingRef.current) return;

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

      // If unzoomed (scale <= 1): handle both horizontal swipe & vertical swipe-to-dismiss
      if (scale <= 1) {
        if (gestureModeRef.current === null) {
          if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
            gestureModeRef.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
          }
        }

        // 🌟 Vertical Swipe-to-Dismiss gesture: fluid real-time drag with rubber-band scale & fade
        if (gestureModeRef.current === 'vertical' && lightboxRef.current) {
          lightboxRef.current.style.transition = 'none';
          const progress = Math.min(Math.abs(dy) / 450, 1);
          const dragScale = 1 - progress * 0.14;
          const opacity = 1 - progress * 0.55;
          lightboxRef.current.style.transform = `translate3d(0, ${dy}px, 0) scale(${dragScale})`;
          lightboxRef.current.style.opacity = `${opacity}`;
          return;
        }

        // Horizontal Swipe between slides
        if (gestureModeRef.current === 'horizontal' && trackRef.current && multi) {
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

    if (isDoubleTappingRef.current) {
      isDoubleTappingRef.current = false;
      try {
        e.preventDefault();
      } catch {}
      return;
    }

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const currentMode = gestureModeRef.current;
    const wasPanning = isPanningRef.current;
    gestureModeRef.current = null;
    isPanningRef.current = false;

    if (!start) return;

    const endX = e.changedTouches[0]?.clientX ?? start.x;
    const endY = e.changedTouches[0]?.clientY ?? start.y;
    const dx = endX - start.x;
    const dy = endY - start.y;
    const dist = Math.hypot(dx, dy);
    const elapsed = Date.now() - start.time;

    // 1. Vertical Swipe-to-Dismiss release check
    if (scale <= 1 && currentMode === 'vertical' && lightboxRef.current) {
      const isFlick = elapsed < 320 && Math.abs(dy) > 50;
      const isDistance = Math.abs(dy) > 85;

      if (isFlick || isDistance) {
        // ✨ Smoothly animate off-screen and dismiss
        lightboxRef.current.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease-out';
        const exitY = dy > 0 ? '100vh' : '-100vh';
        lightboxRef.current.style.transform = `translate3d(0, ${exitY}, 0) scale(0.85)`;
        lightboxRef.current.style.opacity = '0';
        setTimeout(() => {
          onClose();
        }, 220);
        return;
      } else {
        // Rebound smoothly back into place
        lightboxRef.current.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease-out';
        lightboxRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
        lightboxRef.current.style.opacity = '1';
        return;
      }
    }

    // 2. Record tap if displacement is small (< 32px) for instant double-tap on next touch-start
    if (dist < TAP_MAX_DISPLACEMENT && isCurrentImage) {
      lastTapRef.current = { time: start.time, x: endX, y: endY };
      return;
    }

    // 3. If zoomed in and was panning: don't slide
    if (scale > 1 || wasPanning) {
      return;
    }

    // 4. Horizontal Swipe between slides release check
    if (scale <= 1 && currentMode === 'horizontal' && multi && trackRef.current) {
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
    gestureModeRef.current = null;
    pinchRef.current = null;
    panStartRef.current = null;
    isPanningRef.current = false;
    isDoubleTappingRef.current = false;

    if (lightboxRef.current) {
      lightboxRef.current.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease-out';
      lightboxRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
      lightboxRef.current.style.opacity = '1';
    }

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
      ref={lightboxRef}
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
        onDoubleClick={onDoubleClick}
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
                        : 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)',
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
