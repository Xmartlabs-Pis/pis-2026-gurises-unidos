'use client';

import 'leaflet/dist/leaflet.css';
import type { PathOptions } from 'leaflet';
import { GeoJSON, MapContainer } from 'react-leaflet';
import { getUruguayMapData } from '@/lib/map/uruguay-map';

const DEPARTMENT_STYLE: PathOptions = {
  color: 'var(--primary)',
  weight: 1,
  fillColor: 'var(--muted)',
  fillOpacity: 1,
};

export default function UruguayMap() {
  const { center, zoom, departments } = getUruguayMapData();

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomSnap={0.25}
      className="bg-card h-full w-full rounded-xl"
    >
      <GeoJSON data={departments} style={DEPARTMENT_STYLE} />
    </MapContainer>
  );
}
