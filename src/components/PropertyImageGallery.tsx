import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
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
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchHandledRef = useRef(false);
  const slides = useMemo(() => buildSlides(images, videoUrl), [images, videoUrl]);
  const imageUrls = useMemo(() => images.filter(Boolean), [images]);
  const poster = imageUrls[0] ?? FALLBACK_IMAGE;
  const multi = slides.length > 1;

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const goTo = useCallback(
    (next: number) => {
      const i = ((next % slides.length) + slides.length) % slides.length;
      setIndex(i);
    },
    [slides.length],
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
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = touchStart.current.x - e.changedTouches[0].clientX;
    const dy = touchStart.current.y - e.changedTouches[0].clientY;
    const moved = Math.hypot(dx, dy);
    touchStart.current = null;

    if (multi && Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy)) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      const forward = rtl ? dx < 0 : dx > 0;
      goTo(index + (forward ? 1 : -1));
      return;
    }

    if (moved < 14 && slides[index]?.type === 'image') {
      touchHandledRef.current = true;
      handleImageTap(index);
    }
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
          onTouchEnd={onTouchEnd}
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
                  <div className="property-gallery-reel-frame">
                    {index === i ? (
                      <VideoEmbed url={slide.url} aspect="reel" />
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
