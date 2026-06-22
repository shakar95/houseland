import { Link } from 'react-router-dom';
import { Images } from 'lucide-react';
import type { Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';

export function PropertyGridCard({ property }: { property: Property }) {
  const { enumLabel, propertyTitle } = useLanguage();
  const img = property.images[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600';
  const title = propertyTitle(property.code, property.title);
  const hasMultipleImages = (property.imageCount ?? property.images.filter(Boolean).length) > 1;

  return (
    <Link to={`/property/${property.code}`} className="property-grid-tile" aria-label={title}>
      <img src={img} alt={title} loading="lazy" />
      <div className="property-grid-tile-overlay" />
      {hasMultipleImages && (
        <span className="property-grid-tile-multi" aria-hidden="true">
          <Images className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="property-grid-tile-type">{enumLabel(property.transactionType)}</span>
      <div className="property-grid-tile-meta">
        <span className="property-grid-tile-price">{formatPrice(property.price, property.currency)}</span>
        <span className="property-grid-tile-code">{property.code}</span>
      </div>
    </Link>
  );
}
