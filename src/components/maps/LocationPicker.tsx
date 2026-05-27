import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const SULAY_CENTER: [number, number] = [35.556, 45.432];

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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

interface Props {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitude, longitude, onChange }: Props) {
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
        <DraggableMarker position={pos} onChange={handle} />
      </MapContainer>
      <p className="mt-2 text-xs text-royal-400">Click map or drag pin for exact location (admin only).</p>
    </div>
  );
}
