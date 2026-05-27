import { Link } from 'react-router-dom';
import { Bed, Bath, Maximize, MapPin } from 'lucide-react';
import type { Property } from '@/types';
import { formatPrice, labelEnum } from '@/lib/format';

export function PropertyCard({ property }: { property: Property }) {
  const img = property.images[0] || '/placeholder-property.jpg';
  return (
    <Link to={`/property/${property.code}`} className="card-luxury group overflow-hidden transition hover:border-gold-500/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={property.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded bg-royal-950/80 px-2 py-1 text-xs font-semibold text-gold-400">
          {property.code}
        </span>
        <span className="absolute right-3 top-3 rounded bg-gold-500 px-2 py-1 text-xs font-bold text-royal-950">
          {labelEnum(property.transactionType)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl text-white group-hover:text-gold-300">{property.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-royal-300">
          <MapPin className="h-3.5 w-3.5 text-gold-500" />
          {property.neighborhood}
        </p>
        <p className="mt-2 text-lg font-semibold text-gold-400">
          {formatPrice(property.price, property.currency)}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-royal-300">
          <span className="flex items-center gap-1">
            <Maximize className="h-3.5 w-3.5" /> {property.areaSqm} m²
          </span>
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
