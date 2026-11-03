import { RegionExplorer } from '@/components/map/region-explorer';
import { GEOGRAPHIC_REGIONS } from '@/lib/projects/geographic-regions';
import type { PublicRegion } from '@/lib/projects/public-projects';

export function RegionPresence({ year }: { year: number }) {
  const regions: PublicRegion[] = GEOGRAPHIC_REGIONS.map((region) => ({ ...region, projects: [] }));
  return <RegionExplorer key={year} year={year} regions={regions} />;
}
