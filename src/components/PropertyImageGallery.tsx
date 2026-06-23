import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VideoEmbed } from '@/components/VideoEmbed';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200';

type ImageSlide = { type: 'image'; src: string; key: string };
type VideoSlide = { type: 'video'; url: string; key: string };
type Slide = ImageSlide | VideoSlide;

type Props = {
  images: string[];
  videoUrl?: string | null;
  alt: string;
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

export function PropertyImageGallery({ images, videoUrl, alt }: Props) {
  const { rtl, t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const slides = useMemo(() => buildSlides(images, videoUrl), [images, videoUrl]);
  const poster = images.filter(Boolean)[0] ?? FALLBACK_IMAGE;
  const multi = slides.length > 1;

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const scrollTo = useCallback(
    (next: number) => {
      const el = trackRef.current;
      if (!el) return;
      const i = ((next % slides.length) + slides.length) % slides.length;
      const slide = el.children[i] as HTMLElement | undefined;
      slide?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      setIndex(i);
    },
    [slides.length],
  );

  const syncIndexFromScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.children.length === 0) return;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const r = child.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setIndex(closest);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !multi) return;
    el.addEventListener('scroll', syncIndexFromScroll, { passive: true });
    return () => el.removeEventListener('scroll', syncIndexFromScroll);
  }, [multi, syncIndexFromScroll]);

  const activeIsReel = slides[index]?.type === 'video';

  return (
    <div className="property-gallery">
      <div className={`property-gallery-viewport${activeIsReel ? ' property-gallery-viewport--reel' : ''}`}>
        <div ref={trackRef} className="property-gallery-track" dir={rtl ? 'rtl' : 'ltr'}>
          {slides.map((slide, i) =>
            slide.type === 'image' ? (
              <div key={slide.key} className="property-gallery-slide">
                <img
                  src={slide.src}
                  alt={i === index ? alt : ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </div>
            ) : (
              <div key={slide.key} className="property-gallery-slide property-gallery-slide--reel">
                {index === i ? (
                  <VideoEmbed url={slide.url} aspect="reel" />
                ) : (
                  <button
                    type="button"
                    className="property-gallery-video-poster"
                    onClick={() => scrollTo(i)}
                    aria-label={t.property.video}
                  >
                    <img src={poster} alt="" loading="lazy" draggable={false} />
                    <span className="property-gallery-play">
                      <Play className="h-8 w-8 fill-white text-white" />
                    </span>
                  </button>
                )}
              </div>
            ),
          )}
        </div>

        {multi && (
          <>
            <button
              type="button"
              className="property-gallery-nav property-gallery-nav-prev"
              onClick={() => scrollTo(index - 1)}
              aria-label={t.property.photoPrev}
            >
              <PrevIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="property-gallery-nav property-gallery-nav-next"
              onClick={() => scrollTo(index + 1)}
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
                onClick={() => scrollTo(i)}
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
                  onClick={() => scrollTo(i)}
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
                  onClick={() => scrollTo(i)}
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
  );
}
