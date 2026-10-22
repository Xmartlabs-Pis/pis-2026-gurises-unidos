'use client';

import 'leaflet/dist/leaflet.css';
import type { Feature } from 'geojson';
import { Browser, geoJSON, type Path, type PathOptions } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { GeoJSON, MapContainer, useMap } from 'react-leaflet';
import type { DepartmentProjectCounts } from '@/lib/projects/department-project-counts';
import { getUruguayMapData } from '@/lib/map/uruguay-map';

const MAX_ZOOM_LEVELS_IN = 3;
const BOUNDS_PADDING_RATIO = 0.4;
const HINT_DURATION_MS = 500;

const DEPARTMENT_STYLE: PathOptions = {
  color: 'var(--surface-brand-deep)',
  weight: 1,
  fillColor: 'var(--surface-page)',
  fillOpacity: 1,
};

const HIGHLIGHT_STYLE: PathOptions = {
  weight: 2,
  fillColor: 'var(--surface-brand-deep)',
  fillOpacity: 0.4,
};

type UruguayMapProps = {
  projectCounts: DepartmentProjectCounts[];
};

function buildTooltip(name: string, counts?: DepartmentProjectCounts) {
  const total = counts?.total ?? 0;
  const active = counts?.active ?? 0;
  const tooltip = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = name;
  tooltip.append(title);
  for (const line of [
    `${total} ${total === 1 ? 'proyecto' : 'proyectos'} en total`,
    `${active} ${active === 1 ? 'activo' : 'activos'}`,
  ]) {
    const row = document.createElement('div');
    row.textContent = line;
    tooltip.append(row);
  }
  return tooltip;
}

function bindDepartmentHover(
  feature: Feature,
  layer: Path,
  countsByDepartment: Map<string, DepartmentProjectCounts>
) {
  const name: string = feature.properties?.name;
  layer.bindTooltip(buildTooltip(name, countsByDepartment.get(name)), { sticky: true });
  layer.on({
    mouseover: () => layer.setStyle(HIGHLIGHT_STYLE),
    mouseout: () => layer.setStyle(DEPARTMENT_STYLE),
  });
}

function TwoFingerHint() {
  const map = useMap();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!Browser.mobile) return;
    const container = map.getContainer();
    const showHint = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      setVisible(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setVisible(false), HINT_DURATION_MS);
    };
    container.addEventListener('touchmove', showHint, { passive: true });
    return () => {
      container.removeEventListener('touchmove', showHint);
      clearTimeout(timeoutRef.current);
    };
  }, [map]);

  return (
    <div
      aria-hidden
      className={`bg-surface-brand-deep/40 pointer-events-none absolute inset-0 z-1000 flex items-center justify-center rounded-xl px-6 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="bg-surface-brand-deep rounded-lg px-4 py-2 text-center text-sm font-medium text-white">
        Usá dos dedos para mover el mapa
      </span>
    </div>
  );
}

export default function UruguayMap({ projectCounts }: UruguayMapProps) {
  const { center, zoom, departments } = getUruguayMapData();
  const countsByDepartment = new Map(projectCounts.map((counts) => [counts.department, counts]));
  const maxBounds = geoJSON(departments).getBounds().pad(BOUNDS_PADDING_RATIO);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomSnap={0.25}
      dragging={!Browser.mobile}
      minZoom={zoom}
      maxZoom={zoom + MAX_ZOOM_LEVELS_IN}
      maxBounds={maxBounds}
      maxBoundsViscosity={0.5}
      className="bg-surface-page h-full w-full rounded-xl"
    >
      <GeoJSON
        data={departments}
        style={DEPARTMENT_STYLE}
        onEachFeature={(feature, layer) =>
          bindDepartmentHover(feature, layer as Path, countsByDepartment)
        }
      />
      <TwoFingerHint />
    </MapContainer>
  );
}
