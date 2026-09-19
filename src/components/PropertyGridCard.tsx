import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Images, Play } from 'lucide-react';
import type { Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { decodeMediaUrl, prefetchPropertyVideo } from '@/lib/videoPrefetch';

const FALLBACK =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600';

export function PropertyGridCard({ property }: { property: Property }) {
  const { enumLabel, propertyTitle, lang } = useLanguage();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const rawImg = property.images?.[0] || property.thumbnailUrl || FALLBACK;
  const img = decodeMediaUrl(rawImg);
  const title = propertyTitle(property.code, property.title);
  const hasMultipleImages = (property.imageCount ?? property.images?.filter(Boolean).length ?? 0) > 1;
  const hasVideo = Boolean(property.videoLink?.trim());

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !hasVideo || !property.videoLink) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void prefetchPropertyVideo(property.videoLink);
          // Warm the poster image too
          const pre = new Image();
          pre.referrerPolicy = 'no-referrer';
          pre.src = img;
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasVideo, property.videoLink, img]);

  return (
    <Link
      ref={rootRef}
      to={`/property/${property.code}`}
      className="property-grid-tile"
      aria-label={title}
      onMouseEnter={() => {
        if (hasVideo) void prefetchPropertyVideo(property.videoLink);
      }}
      onTouchStart={() => {
        if (hasVideo) void prefetchPropertyVideo(property.videoLink);
      }}
    >
      <img src={img} alt={title} loading="lazy" referrerPolicy="no-referrer" />
      <div className="property-grid-tile-overlay" />
      {hasVideo && (
        <span className="property-grid-tile-play" aria-hidden="true">
          <Play className="h-4 w-4 fill-current" />
        </span>
      )}
      {hasMultipleImages && (
        <span className="property-grid-tile-multi" aria-hidden="true">
          <Images className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="property-grid-tile-type">
        {enumLabel(property.propertyType)} · {enumLabel(property.transactionType)}
      </span>
      <div className="property-grid-tile-meta">
        <span className="property-grid-tile-price">{formatPrice(property.price, property.currency, lang)}</span>
        <span className="property-grid-tile-code">{property.code}</span>
      </div>
    </Link>
  );
}
