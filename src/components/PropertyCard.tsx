import { Link } from 'react-router-dom';
import { Bed, Bath, Maximize, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';

export function PropertyCard({ property }: { property: Property }) {
  const { enumLabel, propertyTitle, rtl } = useLanguage();
  const img = property.images[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400';
  const title = propertyTitle(property.code, property.title);
  const Chevron = rtl ? ChevronLeft : ChevronRight;

  return (
    <Link to={`/property/${property.code}`} className="property-card">
      <div className="property-card-image">
        <img src={img} alt={title} loading="lazy" />
        <span className="property-card-badge">{property.code}</span>
        <span className="property-card-type">{enumLabel(property.transactionType)}</span>
      </div>
      <div className="property-card-body">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="property-card-title">{title}</h3>
            <p className="property-card-location">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {property.neighborhood}
            </p>
          </div>
          <Chevron className="mt-1 h-5 w-5 shrink-0 text-royal-500" />
        </div>
        <p className="property-card-price">{formatPrice(property.price, property.currency)}</p>
        <div className="property-card-stats">
          <span>
            <Maximize className="h-3.5 w-3.5" /> {property.areaSqm} m²
          </span>
          {property.bedrooms != null && (
            <span>
              <Bed className="h-3.5 w-3.5" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span>
              <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
            </span>
          )}
          <span className="text-royal-500">{enumLabel(property.propertyType)}</span>
        </div>
      </div>
    </Link>
  );
}
