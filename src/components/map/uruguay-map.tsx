'use client';

import 'leaflet/dist/leaflet.css';
import type { Feature } from 'geojson';
import {
  Browser,
  geoJSON,
  type GeoJSON as LeafletGeoJSON,
  type LatLngBounds,
  type Path,
  type PathOptions,
  point,
  svg,
} from 'leaflet';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { GeoJSON, MapContainer, ZoomControl, useMap } from 'react-leaflet';
import { getUruguayMapData } from '@/lib/map/uruguay-map';

const FIT_PADDING_PX = 8;
const MAX_ZOOM_LEVELS_IN = 3;
const BOUNDS_PADDING_RATIO = 0.4;
const RENDER_PADDING_RATIO = 1;

export type UruguayMapProps = {
  projectCounts: { department: string; total: number }[];
  selectedDepartment: string;
  onSelectDepartment: (department: string) => void;
};

function getDepartmentStyle(name: string, total: number, selectedDepartment: string): PathOptions {
  const selected = name === selectedDepartment;
  return {
    color: '#ffffff',
    weight: selected ? 2.5 : 2,
    fillColor: selected || total > 0 ? 'var(--primary)' : '#e8e9e5',
    fillOpacity: selected || total === 0 ? 1 : 0.3,
  };
}

function FitToDepartments({ bounds }: { bounds: LatLngBounds }) {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      const zoom = map.getBoundsZoom(bounds, false, point(FIT_PADDING_PX, FIT_PADDING_PX));
      map.setMinZoom(zoom);
      map.setMaxZoom(zoom + MAX_ZOOM_LEVELS_IN);
      map.setView(bounds.getCenter(), zoom, { animate: false });
    };
    fit();
    map.on('resize', fit);
    return () => {
      map.off('resize', fit);
    };
  }, [map, bounds]);

  return null;
}

function DepartmentInteractions({
  geoJsonRef,
  countsByDepartment,
  selectedDepartment,
  onSelectDepartment,
}: {
  geoJsonRef: RefObject<LeafletGeoJSON | null>;
  countsByDepartment: Map<string, number>;
  selectedDepartment: string;
  onSelectDepartment: (department: string) => void;
}) {
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    geoJsonRef.current?.eachLayer((layer) => {
      const departmentLayer = layer as Path & { feature?: Feature };
      const name: string | undefined = departmentLayer.feature?.properties?.name;
      if (!name) return;
      const total = countsByDepartment.get(name) ?? 0;
      const style = getDepartmentStyle(name, total, selectedDepartment);
      departmentLayer.setStyle(style);
      const tooltip = document.createElement('span');
      tooltip.textContent = `${name}: ${total} ${total === 1 ? 'proyecto' : 'proyectos'}`;
      departmentLayer.unbindTooltip();
      departmentLayer.bindTooltip(tooltip, { sticky: true });
      const select = () => onSelectDepartment(name);
      const highlight = () =>
        departmentLayer.setStyle({ fillColor: 'var(--primary)', fillOpacity: 0.7 });
      const reset = () => departmentLayer.setStyle(style);
      departmentLayer.on('click', select).on('mouseover', highlight).on('mouseout', reset);
      const element = departmentLayer.getElement();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      };
      if (element) {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        element.setAttribute(
          'aria-label',
          `${name}: ${total} ${total === 1 ? 'proyecto' : 'proyectos'}`
        );
        element.setAttribute('aria-pressed', String(name === selectedDepartment));
        element.setAttribute('aria-controls', 'department-projects');
        element.addEventListener('keydown', onKeyDown as EventListener);
        element.addEventListener('focus', highlight);
        element.addEventListener('blur', reset);
      }
      cleanups.push(() => {
        departmentLayer.off('click', select).off('mouseover', highlight).off('mouseout', reset);
        element?.removeEventListener('keydown', onKeyDown as EventListener);
        element?.removeEventListener('focus', highlight);
        element?.removeEventListener('blur', reset);
      });
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [geoJsonRef, countsByDepartment, selectedDepartment, onSelectDepartment]);
  return null;
}

export default function UruguayMap({
  projectCounts,
  selectedDepartment,
  onSelectDepartment,
}: UruguayMapProps) {
  const { center, zoom, departments } = getUruguayMapData();
  const countsByDepartment = useMemo(
    () => new Map(projectCounts.map(({ department, total }) => [department, total])),
    [projectCounts]
  );
  const geoJsonRef = useRef<LeafletGeoJSON>(null);
  const bounds = useMemo(() => geoJSON(departments).getBounds(), [departments]);
  const maxBounds = useMemo(() => bounds.pad(BOUNDS_PADDING_RATIO), [bounds]);
  const renderer = useMemo(() => svg({ padding: RENDER_PADDING_RATIO }), []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomSnap={0.1}
      renderer={renderer}
      zoomControl={false}
      attributionControl={false}
      dragging={!Browser.mobile}
      maxBounds={maxBounds}
      maxBoundsViscosity={0.5}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={true}
      boxZoom={false}
      keyboard={false}
      className="department-map h-full w-full"
    >
      <ZoomControl position="topleft" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
      <GeoJSON
        ref={geoJsonRef}
        data={departments}
        style={(feature) =>
          getDepartmentStyle(
            feature?.properties?.name ?? '',
            countsByDepartment.get(feature?.properties?.name ?? '') ?? 0,
            selectedDepartment
          )
        }
      />
      <DepartmentInteractions
        geoJsonRef={geoJsonRef}
        countsByDepartment={countsByDepartment}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={onSelectDepartment}
      />
      <FitToDepartments bounds={bounds} />
    </MapContainer>
  );
}
