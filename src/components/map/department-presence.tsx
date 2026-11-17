import { DepartmentExplorer } from '@/components/map/department-explorer';
import { getPublicDepartments } from '@/lib/projects/public-projects';

export async function DepartmentPresence({ year }: { year: number }) {
  const departments = await getPublicDepartments(year);

  return <DepartmentExplorer key={year} year={year} departments={departments} />;
}
