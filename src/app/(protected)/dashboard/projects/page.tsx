import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProjectsCardList } from '@/components/projects/projects-card-listing';
import { ProjectsCardListSkeleton } from '@/components/projects/projects-card-listing-skeleton';
import { listBeneficiaryYears, listProjectFilterOptions, listProjects } from '@/lib/projects/list';
import {
  resolveProjectListFilters,
  type RawProjectFilters,
} from '@/lib/validation/project-filters';
import { redirectToCanonical } from '@/lib/url-filters';

const PROJECTS_PATH = '/dashboard/projects';

type ProjectsPageProps = {
  searchParams: Promise<RawProjectFilters>;
};

async function Projects({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const [years, options] = await Promise.all([listBeneficiaryYears(), listProjectFilterOptions()]);
  const { canonical, filters } = resolveProjectListFilters(params, { years, ...options });
  redirectToCanonical(PROJECTS_PATH, params, canonical);

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
