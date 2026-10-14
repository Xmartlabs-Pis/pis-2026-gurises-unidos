import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProjectsCardList } from '@/components/projects/projects-card-listing';
import { ProjectsCardListSkeleton } from '@/components/projects/projects-card-listing-skeleton';
import { listBeneficiaryYears, listProjectFilterOptions, listProjects } from '@/lib/projects/list';
import {
  PROJECT_LIST_PAGE_SIZE,
  parseProjectFilters,
  type RawProjectFilters,
} from '@/lib/validation/project-filters';
import { firstValue, redirectToCanonical } from '@/lib/url-filters';

const PROJECTS_PATH = '/dashboard/projects';
const DEFAULT_STATUS = 'active';
const ALL = 'all';

type ProjectsPageProps = {
  searchParams: Promise<RawProjectFilters>;
};

async function Projects({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const [years, options] = await Promise.all([listBeneficiaryYears(), listProjectFilterOptions()]);
  const parsed = parseProjectFilters(params);

  const status = firstValue(params.status) === ALL ? ALL : parsed.status;
  const beneficiaryYear =
    firstValue(params.beneficiaryYear) === ALL
      ? ALL
      : years.find((year) => year === parsed.beneficiaryYear);
  const departmentId = options.departments.find(({ id }) => id === parsed.departmentId)?.id;
  const topicId = options.topics.find(({ id }) => id === parsed.topicId)?.id;

  redirectToCanonical(PROJECTS_PATH, params, {
    status,
    beneficiaryYear,
    search: parsed.search,
    departmentId,
    topicId,
  });

  const filters = parseProjectFilters({
    status: status ?? DEFAULT_STATUS,
    beneficiaryYear: String(beneficiaryYear ?? years[0] ?? ''),
    search: parsed.search,
    departmentId: departmentId?.toString(),
    topicId: topicId?.toString(),
    pageSize: String(PROJECT_LIST_PAGE_SIZE),
  });
  const { items, total, page, totalPages } = await listProjects(filters);

  return (
    <ProjectsCardList
      projects={items}
      total={total}
      page={page}
      totalPages={totalPages}
      years={years}
      departments={options.departments}
      topics={options.topics}
      departmentId={filters.departmentId}
      topicId={filters.topicId}
      status={filters.status ?? 'all'}
      beneficiaryYear={filters.beneficiaryYear}
      search={filters.search}
    />
  );
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <Suspense fallback={<ProjectsCardListSkeleton />}>
      <Projects searchParams={searchParams} />
    </Suspense>
  );
}
