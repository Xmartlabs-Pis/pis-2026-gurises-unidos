import { RegionExplorer } from '@/components/map/region-explorer';
import { getPublicRegions } from '@/lib/projects/public-projects';

export async function RegionPresence({ year }: { year: number }) {
  const regions = await getPublicRegions(year);
  return <RegionExplorer key={year} year={year} regions={regions} />;
}
