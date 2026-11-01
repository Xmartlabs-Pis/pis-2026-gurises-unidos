import type { FeatureCollection } from 'geojson';
import type { LatLngTuple } from 'leaflet';
import departments from './uruguay-departments.json';

export type UruguayMapData = {
  center: LatLngTuple;
  zoom: number;
  departments: FeatureCollection;
};

export function getUruguayMapData(): UruguayMapData {
  return {
    center: [-32.53, -55.77],
    zoom: 6,
    departments: departments as FeatureCollection,
  };
}
