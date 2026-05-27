import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import { getZoneCenter } from '@/lib/neighborhoods';

interface Props {
  neighborhood: string;
}

/** Public map: blurred radius over neighborhood zone — exact coords hidden */
export function ObfuscatedMap({ neighborhood }: Props) {
  const [lat, lng] = getZoneCenter(neighborhood);
  const radiusMeters = 800;

  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border border-royal-600">
      <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[lat, lng]}
          radius={radiusMeters}
          pathOptions={{
            color: '#d4a017',
            fillColor: '#1e3270',
            fillOpacity: 0.45,
            weight: 2,
            dashArray: '8 8',
          }}
        />
      </MapContainer>
      <p className="mt-2 text-center text-sm text-royal-300">
        Approximate area: <span className="text-gold-400">{neighborhood}</span> — exact address protected
      </p>
    </div>
  );
}
