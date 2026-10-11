import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VideoEmbed } from '@/components/VideoEmbed';
import { PropertyImageLightbox } from '@/components/PropertyImageLightbox';
import { prefetchPropertyVideo } from '@/lib/videoPrefetch';
import { resolveThumbnailUrl } from '@/lib/media';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200';

type ImageSlide = { type: 'image'; src: string; key: string };
type VideoSlide = { type: 'video'; url: string; key: string };
type Slide = ImageSlide | VideoSlide;

type Props = {
  images: string[];
  videoUrl?: string | null;
  imageCount?: number;
  alt: string;
  className?: string;
};

function buildSlides(images: string[], videoUrl?: string | null, imageCount?: number): Slide[] {
  const all = images.filter(Boolean).map((u) => u.replace(/&amp;/gi, '&'));
  const url = videoUrl?.trim();

  // If there is a video and the post does not have a separate multi-image photo gallery
  // (e.g. imageCount is 0, or all.length <= 1, or images only hold the generated video poster)
  const isVideoOnly = Boolean(
    url && (
      imageCount === 0 ||
      all.length === 0 ||
      all.length === 1 ||
      all.every((img) => img.includes('video-poster') || img.includes('t15.'))
    )
  );

  const slides: Slide[] = [];

  if (isVideoOnly && url) {
    // Only video slide! Do not show the added thumbnail poster as a photo slide.
    slides.push({ type: 'video', url, key: 'video' });
    return slides;
  }

  // If there's a video along with real photos: put video at index 0 so it's the primary media
  if (url) {
    slides.push({ type: 'video', url, key: 'video' });
  }

  if (all.length > 0) {
    for (let i = 0; i < all.length; i++) {
      slides.push({ type: 'image', src: all[i], key: `img-${i}-${all[i]}` });
    }
  }

  if (slides.length === 0) {
    const poster = resolveThumbnailUrl(all[0], videoUrl);
    slides.push({ type: 'image', src: poster, key: 'fallback' });
  }

  return slides;
}

export function PropertyImageGallery({ images, videoUrl, imageCount, alt, className }: Props) {
  const { rtl, t, formatNum } = useLanguage();
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef<boolean | null>(null);
  const touchHandledRef = useRef(false);
  const slides = useMemo(
    () => buildSlides(images, videoUrl, imageCount),
    [images, videoUrl, imageCount],
  );
  const imageUrls = useMemo(
    () => images.filter(Boolean).map((u) => u.replace(/&amp;/gi, '&')),
    [images],
  );
  const poster = resolveThumbnailUrl(imageUrls[0], videoUrl);
  const multi = slides.length > 1;

  // Track which slides have been loaded to prevent fetching all images at once
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0, 1]));

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const videoSlideIndex = useMemo(
    () => slides.findIndex((s) => s.type === 'video'),
    [slides],
  );
  const isVideoOnly = useMemo(() => {
    if (!videoUrl?.trim()) return false;
    if (imageCount === 0) return true;
    if (images.filter(Boolean).length <= 1) return true;
    return slides.length === 1 && slides[0]?.type === 'video';
  }, [videoUrl, imageCount, images, slides]);
  const prevIndexRef = useRef(index);
  const [videoKey, setVideoKey] = useState(0);
  const videoIsActive = videoSlideIndex >= 0 && index === videoSlideIndex;

  useEffect(() => {
    if (videoUrl) void prefetchPropertyVideo(videoUrl);
  }, [videoUrl]);

  // Immediately focus on the video slide and ensure it's loaded and autoplayed
  useEffect(() => {
    const targetIdx = videoSlideIndex >= 0 ? videoSlideIndex : 0;
    setIndex(targetIdx);
    setLoadedSlides((prev) => new Set(prev).add(targetIdx));
    if (isVideoOnly) {
      setVideoKey((k) => k + 1);
    }
  }, [videoUrl, images, isVideoOnly, videoSlideIndex]);

  useEffect(() => {
    if (!isVideoFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsVideoFullscreen(false);
      void document.exitFullscreen?.().catch(() => {});
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isVideoFullscreen]);

  useEffect(() => {
    if (prevIndexRef.current === videoSlideIndex && index !== videoSlideIndex) {
      setVideoKey((k) => k + 1);
    }
    prevIndexRef.current = index;
  }, [index, videoSlideIndex]);

  useEffect(() => {
    setLoadedSlides((prev) => {
      if (prev.has(index) && prev.has(index + 1) && prev.has(index - 1)) return prev;
      const next = new Set(prev);
      next.add(index);
      if (index > 0) next.add(index - 1);
      if (index < slides.length - 1) next.add(index + 1);
      return next;
    });
  }, [index, slides.length]);

  const toggleVideoFullscreen = useCallback(async () => {
    if (!isVideoFullscreen) {
      setIsVideoFullscreen(true);
      try {
        if (videoContainerRef.current?.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
        }
      } catch {}
    } else {
      setIsVideoFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {}
    }
  }, [isVideoFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsVideoFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
      const offset = rtl ? index * 100 : -index * 100;
      trackRef.current.style.transform = `translate3d(${offset}%, 0, 0)`;
    }
  }, [index, rtl]);

  const goTo = useCallback(
    (next: number) => {
      const i = ((next % slides.length) + slides.length) % slides.length;
      setIndex(i);
    },
    [slides.length],
  );

  const openLightbox = useCallback(
    (slideIndex: number) => {
      goTo(slideIndex);
      setLightboxOpen(true);
    },
    [goTo],
  );

  const handleImageTap = useCallback(
    (slideIndex: number) => {
      openLightbox(slideIndex);
    },
    [openLightbox],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    isSwipingRef.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !trackRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
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
      const isAtEnd = index === slides.length - 1 && (rtl ? dx > 0 : dx < 0);
      const effectiveDx = isAtStart || isAtEnd ? dx * 0.25 : dx;
      trackRef.current.style.transform = `translate3d(calc(${baseOffset}% + ${effectiveDx}px), 0, 0)`;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !trackRef.current) return;
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const endY = e.changedTouches[0]?.clientY ?? startY;
    const dx = endX - startX;
    const dy = endY - startY;
    const elapsed = Date.now() - touchStartRef.current.time;
    const wasSwiping = isSwipingRef.current === true;

    touchStartRef.current = null;
    isSwipingRef.current = null;

    if (wasSwiping && multi) {
      trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
      const isFlick = elapsed < 320 && Math.abs(dx) > 28;
      const isDistance = Math.abs(dx) > 48;

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
      return;
    }

    const moved = Math.hypot(dx, dy);
    if (moved < 12 && slides[index]?.type === 'image') {
      touchHandledRef.current = true;
      handleImageTap(index);
    }
  };

  const onTouchCancel = () => {
    if (!touchStartRef.current || !trackRef.current) return;
    touchStartRef.current = null;
    isSwipingRef.current = null;
    trackRef.current.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.9, 0.3, 1)';
    const baseOffset = rtl ? index * 100 : -index * 100;
    trackRef.current.style.transform = `translate3d(${baseOffset}%, 0, 0)`;
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
            ref={trackRef}
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
                    {loadedSlides.has(i) ? (
                      <img
                        src={slide.src}
                        alt={i === index ? alt : ''}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                      />
                    ) : null}
                  </button>
                </div>
              ) : (
                <div key={slide.key} className="property-gallery-slide property-gallery-slide--reel">
                  <div
                    ref={videoContainerRef}
                    className={
                      isVideoFullscreen
                        ? 'fixed inset-0 z-[250] bg-black flex items-center justify-center p-0'
                        : 'property-gallery-reel-frame relative'
                    }
                  >
                    <div className="w-full h-full pointer-events-auto">
                      {loadedSlides.has(i) ? (
                        <VideoEmbed
                          key={`video-${slide.key}-${videoKey}`}
                          url={slide.url}
                          aspect="reel"
                          autoPlay={videoIsActive || isVideoOnly}
                        />
                      ) : null}
                    </div>

                    {/* Fullscreen icon button on video */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVideoFullscreen();
                      }}
                      className="absolute top-3 start-3 z-30 pointer-events-auto inline-flex items-center justify-center h-8 w-8 rounded-full bg-royal-950/90 text-white border border-white/25 shadow-lg backdrop-blur-md hover:bg-royal-900 active:scale-95 transition-all"
                      aria-label={isVideoFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      title={isVideoFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isVideoFullscreen ? (
                        <Minimize2 className="h-4 w-4 text-gold-400" />
                      ) : (
                        <Maximize2 className="h-4 w-4 text-gold-400" />
                      )}
                    </button>

                    {/* Fluid swipe gesture zones across outer perimeter of video (disabled in fullscreen) */}
                    {!isVideoFullscreen && multi && (
                      <>
                        <div
                          className="absolute top-0 inset-x-0 h-28 z-20"
                          style={{ touchAction: 'pan-y' }}
                          onTouchStart={onTouchStart}
                          onTouchMove={onTouchMove}
                          onTouchEnd={onTouchEnd}
                          onTouchCancel={onTouchCancel}
                        />
                        <div
                          className="absolute bottom-0 inset-x-0 h-28 z-20"
                          style={{ touchAction: 'pan-y' }}
                          onTouchStart={onTouchStart}
                          onTouchMove={onTouchMove}
                          onTouchEnd={onTouchEnd}
                          onTouchCancel={onTouchCancel}
                        />
                        <div
                          className="absolute inset-y-28 start-0 w-24 z-20"
                          style={{ touchAction: 'pan-y' }}
                          onTouchStart={onTouchStart}
                          onTouchMove={onTouchMove}
                          onTouchEnd={onTouchEnd}
                          onTouchCancel={onTouchCancel}
                        />
                        <div
                          className="absolute inset-y-28 end-0 w-24 z-20"
                          style={{ touchAction: 'pan-y' }}
                          onTouchStart={onTouchStart}
                          onTouchMove={onTouchMove}
                          onTouchEnd={onTouchEnd}
                          onTouchCancel={onTouchCancel}
                        />
                      </>
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
                {formatNum(index + 1)} / {formatNum(slides.length)}
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
                  aria-label={slide.type === 'video' ? t.property.video : `${formatNum(i + 1)} / ${formatNum(slides.length)}`}
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
                    aria-label={`${formatNum(i + 1)} / ${formatNum(slides.length)}`}
                  >
                    <img src={slide.src} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" />
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
                    <img
                      src={poster}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                    />
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

      {lightboxOpen && slides.length > 0 && (
        <PropertyImageLightbox
          key="property-lightbox"
          slides={slides}
          index={index}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={(next) => {
            goTo(next);
          }}
        />
      )}
    </>
  );
}
