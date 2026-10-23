import { notFound } from 'next/navigation';
import { ProjectTopbarRegistration } from '@/components/layout/topbar-context';
import { BeneficiaryDistribution } from '@/components/projects/detail/beneficiary-distribution';
import { InstitutionalContribution } from '@/components/projects/detail/institutional-contribution';
import { ProjectDetailHeader } from '@/components/projects/detail/project-detail-header';
import { ProjectMetrics } from '@/components/projects/detail/project-metrics';
import { ProjectPublicCard } from '@/components/projects/detail/project-public-card';
import { ProjectRecentActivity } from '@/components/projects/detail/project-recent-activity';
import { ProjectYearEmptyState } from '@/components/projects/detail/project-year-empty-state';
import { getProjectDetail } from '@/lib/projects/detail';

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
};

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await getProjectDetail(id, query.year);

  if (result.status !== 'success') {
    notFound();
  }

  const {
    project,
    selectedYear,
    comparisonYear,
    availableYears,
    hasData,
    canEdit,
    metrics,
    distribution,
    institutionalContribution,
  } = result.data;

  return (
    <div className="bg-surface-page flex-1">
      <ProjectTopbarRegistration
        projectName={project.name}
        selectedYear={selectedYear}
        years={availableYears}
      />
      <div className="mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-4 py-5 sm:gap-4 sm:py-6 lg:px-6">
        <ProjectDetailHeader
          project={project}
          selectedYear={selectedYear}
          years={availableYears}
          canEdit={canEdit}
        />

        {hasData ? (
          <>
            <ProjectMetrics metrics={metrics} comparisonYear={comparisonYear} />
            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-4">
                <BeneficiaryDistribution data={distribution} year={selectedYear} />
                <ProjectPublicCard
                  name={project.name}
                  description={project.publicDescription}
                  coverPhoto={project.coverPhoto}
                />
              </div>
              <InstitutionalContribution data={institutionalContribution} />
            </div>
          </>
        ) : (
          <>
            <ProjectYearEmptyState year={selectedYear} />
            <ProjectPublicCard
              name={project.name}
              description={project.publicDescription}
              coverPhoto={project.coverPhoto}
            />
          </>
        )}
        <ProjectRecentActivity />
      </div>
    </div>
  );
}
