import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VideoEmbed } from '@/components/VideoEmbed';
import { PropertyImageLightbox } from '@/components/PropertyImageLightbox';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200';
const DOUBLE_TAP_MS = 400;
const SINGLE_TAP_DELAY_MS = 450;

type ImageSlide = { type: 'image'; src: string; key: string };
type VideoSlide = { type: 'video'; url: string; key: string };
type Slide = ImageSlide | VideoSlide;

type Props = {
  images: string[];
  videoUrl?: string | null;
  alt: string;
  className?: string;
};

function buildSlides(images: string[], videoUrl?: string | null): Slide[] {
  const imgs = images.filter(Boolean);
  const slides: Slide[] =
    imgs.length > 0
      ? imgs.map((src, i) => ({ type: 'image' as const, src, key: `img-${i}-${src}` }))
      : [{ type: 'image' as const, src: FALLBACK_IMAGE, key: 'fallback' }];

  const url = videoUrl?.trim();
  if (url) {
    const at = Math.min(1, slides.length);
    slides.splice(at, 0, { type: 'video', url, key: 'video' });
  }

  return slides;
}

function imageIndexForSlide(slides: Slide[], slideIndex: number): number {
  return slides.slice(0, slideIndex + 1).filter((s) => s.type === 'image').length - 1;
}

export function PropertyImageGallery({ images, videoUrl, alt, className }: Props) {
  const { rtl, t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxStartScale, setLightboxStartScale] = useState(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchCurrent = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchHandledRef = useRef(false);
  const slides = useMemo(() => buildSlides(images, videoUrl), [images, videoUrl]);
  const imageUrls = useMemo(() => images.filter(Boolean), [images]);
  const poster = imageUrls[0] ?? FALLBACK_IMAGE;
  const multi = slides.length > 1;

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const [videoInteracting, setVideoInteracting] = useState(false);
  const videoTouchStart = useRef<{ x: number; y: number } | null>(null);
  const videoTouchCurrent = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setVideoInteracting(false);
  }, [index]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onStateChange') {
          // 2 = paused, 0 = ended
          if (data.info === 2 || data.info === 0) {
            setVideoInteracting(false);
          } else if (data.info === 1) {
            setVideoInteracting(true);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const i = ((next % slides.length) + slides.length) % slides.length;
      setIndex(i);
    },
    [slides.length],
  );

  const handleSwipe = useCallback(
    (startX: number, startY: number, endX: number, endY: number): boolean => {
      const dx = startX - endX;
      const dy = startY - endY;
      if (multi && Math.abs(dx) >= 20 && Math.abs(dx) > Math.abs(dy)) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        lastTapRef.current = 0;
        const forward = rtl ? dx < 0 : dx > 0;
        goTo(index + (forward ? 1 : -1));
        return true;
      }
      return false;
    },
    [goTo, index, multi, rtl],
  );

  const openLightbox = useCallback(
    (slideIndex: number, zoom = false) => {
      const slide = slides[slideIndex];
      if (slide?.type !== 'image' || imageUrls.length === 0) return;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      setLightboxStartScale(zoom ? 2.5 : 1);
      setLightboxIndex(imageIndexForSlide(slides, slideIndex));
      setLightboxOpen(true);
    },
    [imageUrls.length, slides],
  );

  const handleImageTap = useCallback(
    (slideIndex: number) => {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        openLightbox(slideIndex, true);
        return;
      }
      lastTapRef.current = now;
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        openLightbox(slideIndex, false);
      }, SINGLE_TAP_DELAY_MS);
    },
    [openLightbox],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchCurrent.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchCurrent.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const start = touchStart.current;
    const end = touchCurrent.current ?? {
      x: e.changedTouches[0]?.clientX ?? start.x,
      y: e.changedTouches[0]?.clientY ?? start.y,
    };
    const moved = Math.hypot(start.x - end.x, start.y - end.y);
    touchStart.current = null;
    touchCurrent.current = null;

    if (handleSwipe(start.x, start.y, end.x, end.y)) {
      return;
    }

    if (moved < 14 && slides[index]?.type === 'image') {
      touchHandledRef.current = true;
      handleImageTap(index);
    }
  };

  const onTouchCancel = () => {
    if (!touchStart.current) return;
    const start = touchStart.current;
    const end = touchCurrent.current ?? start;
    touchStart.current = null;
    touchCurrent.current = null;
    handleSwipe(start.x, start.y, end.x, end.y);
  };

  const onVideoOverlayTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    videoTouchStart.current = { x: t.clientX, y: t.clientY };
    videoTouchCurrent.current = { x: t.clientX, y: t.clientY };
  };

  const onVideoOverlayTouchMove = (e: React.TouchEvent) => {
    if (!videoTouchStart.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    videoTouchCurrent.current = { x: t.clientX, y: t.clientY };
  };

  const onVideoOverlayTouchEnd = (e: React.TouchEvent) => {
    if (!videoTouchStart.current) return;
    const start = videoTouchStart.current;
    const end = videoTouchCurrent.current ?? {
      x: e.changedTouches[0]?.clientX ?? start.x,
      y: e.changedTouches[0]?.clientY ?? start.y,
    };
    const moved = Math.hypot(start.x - end.x, start.y - end.y);
    videoTouchStart.current = null;
    videoTouchCurrent.current = null;

    if (handleSwipe(start.x, start.y, end.x, end.y)) {
      return;
    }

    if (moved < 15) {
      setVideoInteracting(true);
    }
  };

  const onVideoOverlayTouchCancel = () => {
    if (!videoTouchStart.current) return;
    const start = videoTouchStart.current;
    const end = videoTouchCurrent.current ?? start;
    videoTouchStart.current = null;
    videoTouchCurrent.current = null;
    handleSwipe(start.x, start.y, end.x, end.y);
  };

  const onVideoOverlayClick = () => {
    setVideoInteracting(true);
  };

  const onImageClick = (slideIndex: number) => {
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    handleImageTap(slideIndex);
  };

  const activeIsReel = slides[index]?.type === 'video';
  const slideOffset = rtl ? index * 100 : -index * 100;

  return (
    <>
      <div className={['property-gallery', className].filter(Boolean).join(' ')}>
        <div
          className={`property-gallery-viewport${activeIsReel ? ' property-gallery-viewport--reel' : ''}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          <div
            className="property-gallery-track"
            style={{ transform: `translate3d(${slideOffset}%, 0, 0)` }}
          >
            {slides.map((slide, i) =>
              slide.type === 'image' ? (
                <div key={slide.key} className="property-gallery-slide">
                  <button
                    type="button"
                    className="property-gallery-image-btn"
                    onClick={() => onImageClick(i)}
                    aria-label={t.property.photoFullscreen}
                  >
                    <img
                      src={slide.src}
                      alt={i === index ? alt : ''}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      draggable={false}
                    />
                  </button>
                </div>
              ) : (
                <div key={slide.key} className="property-gallery-slide property-gallery-slide--reel">
                  <div className="property-gallery-reel-frame relative">
                    {index === i ? (
                      <>
                        <div className={`w-full h-full ${videoInteracting ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                          <VideoEmbed url={slide.url} aspect="reel" autoPlay={videoInteracting} />
                        </div>

                        {!videoInteracting ? (
                          <div
                            className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer select-none bg-black/25 transition-all"
                            style={{ touchAction: 'pan-y' }}
                            onTouchStart={onVideoOverlayTouchStart}
                            onTouchMove={onVideoOverlayTouchMove}
                            onTouchEnd={onVideoOverlayTouchEnd}
                            onTouchCancel={onVideoOverlayTouchCancel}
                            onClick={onVideoOverlayClick}
                          >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/30 text-white shadow-2xl transition hover:scale-105 active:scale-95">
                              <Play className="h-7 w-7 fill-white text-white ms-1" />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Floating Pause Button when video is active */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoInteracting(false);
                              }}
                              className="absolute top-3 start-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-royal-950/85 px-3 py-1.5 text-xs font-semibold text-white border border-white/25 shadow-xl backdrop-blur-md hover:bg-royal-900 active:scale-95 transition pointer-events-auto"
                              aria-label="Pause"
                            >
                              <Pause className="h-3.5 w-3.5 text-gold-400 fill-gold-400" />
                              <span>ڕاگرتن</span>
                            </button>

                            {/* Touch swipe zones across top, bottom, and sides */}
                            {multi && (
                              <>
                                <div
                                  className="absolute top-0 inset-x-0 h-20 z-20"
                                  style={{ touchAction: 'pan-y' }}
                                  onTouchStart={onTouchStart}
                                  onTouchMove={onTouchMove}
                                  onTouchEnd={onTouchEnd}
                                  onTouchCancel={onTouchCancel}
                                />
                                <div
                                  className="absolute bottom-0 inset-x-0 h-20 z-20"
                                  style={{ touchAction: 'pan-y' }}
                                  onTouchStart={onTouchStart}
                                  onTouchMove={onTouchMove}
                                  onTouchEnd={onTouchEnd}
                                  onTouchCancel={onTouchCancel}
                                />
                                <div
                                  className="absolute inset-y-20 start-0 w-20 z-20"
                                  style={{ touchAction: 'pan-y' }}
                                  onTouchStart={onTouchStart}
                                  onTouchMove={onTouchMove}
                                  onTouchEnd={onTouchEnd}
                                  onTouchCancel={onTouchCancel}
                                />
                                <div
                                  className="absolute inset-y-20 end-0 w-20 z-20"
                                  style={{ touchAction: 'pan-y' }}
                                  onTouchStart={onTouchStart}
                                  onTouchMove={onTouchMove}
                                  onTouchEnd={onTouchEnd}
                                  onTouchCancel={onTouchCancel}
                                />
                              </>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="property-gallery-video-poster"
                        onClick={() => goTo(i)}
                        aria-label={t.property.video}
                      >
                        <img src={poster} alt="" loading="lazy" draggable={false} />
                        <span className="property-gallery-play">
                          <Play className="h-8 w-8 fill-white text-white" />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          {multi && (
            <>
              <button
                type="button"
                className="property-gallery-nav property-gallery-nav-prev"
                onClick={() => goTo(index - 1)}
                aria-label={t.property.photoPrev}
              >
                <PrevIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="property-gallery-nav property-gallery-nav-next"
                onClick={() => goTo(index + 1)}
                aria-label={t.property.photoNext}
              >
                <NextIcon className="h-5 w-5" />
              </button>
              <span className="property-gallery-counter" aria-live="polite">
                {index + 1} / {slides.length}
              </span>
            </>
          )}
        </div>

        {multi && (
          <>
            <div className="property-gallery-dots" role="tablist" aria-label={t.property.photos}>
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={slide.type === 'video' ? t.property.video : `${i + 1} / ${slides.length}`}
                  className={i === index ? 'property-gallery-dot is-active' : 'property-gallery-dot'}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <div className="property-gallery-thumbs">
              {slides.map((slide, i) =>
                slide.type === 'image' ? (
                  <button
                    key={slide.key}
                    type="button"
                    className={i === index ? 'property-gallery-thumb is-active' : 'property-gallery-thumb'}
                    onClick={() => goTo(i)}
                    aria-label={`${i + 1} / ${slides.length}`}
                  >
                    <img src={slide.src} alt="" loading="lazy" draggable={false} />
                  </button>
                ) : (
                  <button
                    key={slide.key}
                    type="button"
                    className={
                      i === index
                        ? 'property-gallery-thumb property-gallery-thumb--video is-active'
                        : 'property-gallery-thumb property-gallery-thumb--video'
                    }
                    onClick={() => goTo(i)}
                    aria-label={t.property.video}
                  >
                    <img src={poster} alt="" loading="lazy" draggable={false} />
                    <span className="property-gallery-thumb-play">
                      <Play className="h-4 w-4 fill-white text-white" />
                    </span>
                  </button>
                ),
              )}
            </div>
          </>
        )}
      </div>

      {lightboxOpen && imageUrls.length > 0 && (
        <PropertyImageLightbox
          key={`${lightboxIndex}-${lightboxStartScale}`}
          images={imageUrls}
          index={lightboxIndex}
          alt={alt}
          initialScale={lightboxStartScale}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={(next) => {
            setLightboxIndex(next);
            const slideIdx = slides.findIndex(
              (s, i) => s.type === 'image' && imageIndexForSlide(slides, i) === next,
            );
            if (slideIdx >= 0) setIndex(slideIdx);
          }}
        />
      )}
    </>
  );
}
