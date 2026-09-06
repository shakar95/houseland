import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '@/context/LanguageContext';

const SULAY_CENTER: [number, number] = [35.556, 45.432];

const markerIcon = L.divIcon({
  className: 'custom-gold-marker bg-transparent border-none',
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#d4a017" stroke="#1e3270" stroke-width="1.5" class="w-10 h-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#1e3270"/></svg>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function DraggableMarker({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onChange(lat, lng);
        },
      }}
    />
  );
}

function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 14, { animate: true, duration: 1 });
  }, [position, map]);
  return null;
}

interface Props {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitude, longitude, onChange }: Props) {
  const { t } = useLanguage();
  const [pos, setPos] = useState<[number, number]>([latitude || SULAY_CENTER[0], longitude || SULAY_CENTER[1]]);

  useEffect(() => {
    if (latitude && longitude) setPos([latitude, longitude]);
  }, [latitude, longitude]);

  const handle = (lat: number, lng: number) => {
    setPos([lat, lng]);
    onChange(lat, lng);
  };

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-royal-600">
      <MapContainer center={pos} zoom={14} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater position={pos} />
        <DraggableMarker position={pos} onChange={handle} />
      </MapContainer>
      <p className="mt-2 text-xs text-royal-400">{t.submit.mapHint}</p>
    </div>
  );
}
