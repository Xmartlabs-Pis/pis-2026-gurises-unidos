import type { UserRole } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { getActiveBeneficiaryCategories } from '@/lib/beneficiary-categories';
import { getCurrentYear } from '@/lib/metrics/year';
import {
  COUNTERPARTY_LABEL,
  GEOGRAPHIC_SCOPE_OPTIONS,
  STATUS_LABEL,
  ZONE_OPTIONS,
  getIntensityLabel,
  sumBeneficiaries,
  type BeneficiaryCounts,
} from '@/lib/project-display';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { getChildrenReached } from '@/lib/projects/detail-metrics';
import { PROJECT_LOCATION_SELECT, getTerritoryNames } from '@/lib/projects/location';
import { canEditProject } from '@/lib/projects/permissions';
import { formatDelta, toFileNameSegment } from '@/lib/reports/format';
import type { ReportBar, ReportKpi } from '@/lib/reports/impact-report';

export type ReportField = { label: string; value: string };

export type ProjectSheetData = {
  year: number;
  isCurrentYear: boolean;
  generatedAt: Date;
  name: string;
  description: string | null;
  fields: ReportField[];
  extraFields: ReportField[];
  longFields: ReportField[];
  kpis: ReportKpi[] | null;
  categories: ReportBar[] | null;
};

const LIST_FORMAT = new Intl.ListFormat('es', { type: 'conjunction' });
const EMPTY_VALUE = '—';

function joinList(items: string[]) {
  return items.length > 0 ? LIST_FORMAT.format(items) : EMPTY_VALUE;
}

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function getProjectSheetFileName(projectName: string, year: number) {
  return `Ficha-${toFileNameSegment(projectName) || 'proyecto'}-${year}.pdf`;
}

export async function getProjectSheetData(
  user: { id: number; role: UserRole },
  projectId: number,
  year: number
) {
  const previousYear = year - 1;

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      name: true,
      status: true,
      intensity: true,
      counterpartyType: true,
      startYear: true,
      endYear: true,
      leadCoordinatorId: true,
      zone: true,
      generalObjective: true,
      publicDescription: true,
      showOnLanding: true,
      ...PROJECT_LOCATION_SELECT,
      leadCoordinator: { select: { firstName: true, lastName: true } },
      topics: { orderBy: { name: 'asc' }, select: { name: true } },
      strategicLines: { orderBy: { name: 'asc' }, select: { name: true } },
      projectBeneficiaries: {
        where: { year: { in: [year, previousYear] } },
        select: { year: true, ...BENEFICIARY_VALUES_SELECT },
      },
    },
  });

  if (project === null) return { status: 'notFound' as const };
  if (!canEditProject(user, project)) return { status: 'forbidden' as const };

  const categories = await getActiveBeneficiaryCategories();
  const activeKeys = new Set<string>(categories.map(({ key }) => key));
  const countsFor = (recordYear: number): BeneficiaryCounts | null => {
    const record = project.projectBeneficiaries.find((item) => item.year === recordYear);
    if (!record) return null;
    const counts = toBeneficiaryCounts(
      record.values.filter(({ category }) => activeKeys.has(category.key))
    );
    return sumBeneficiaries(counts) > 0 ? counts : null;
  };
  const current = countsFor(year);
  const previous = countsFor(previousYear);

  const kpis: ReportKpi[] | null = current && [
    {
      value: getChildrenReached(current) ?? 0,
      label: 'niños, niñas y adolescentes alcanzados',
      delta: formatDelta(
        getChildrenReached(current) ?? 0,
        getChildrenReached(previous),
        previousYear,
        'count'
      ),
    },
    {
      value: current.families,
      label: 'familias acompañadas',
      delta: formatDelta(current.families, previous?.families ?? null, previousYear, 'percent'),
    },
    {
      value: current.coordinatedInstitutions,
      label: 'instituciones vinculadas',
      delta: formatDelta(
        current.coordinatedInstitutions,
        previous?.coordinatedInstitutions ?? null,
        previousYear,
        'count'
      ),
    },
  ];

  const data: ProjectSheetData = {
    year,
    isCurrentYear: year === getCurrentYear(),
    generatedAt: new Date(),
    name: project.name,
    description: project.generalObjective,
    fields: [
      { label: 'Temática', value: joinList(project.topics.map(({ name }) => name)) },
      { label: 'Estado', value: STATUS_LABEL[project.status] },
      { label: 'Intensidad', value: getIntensityLabel(project.intensity) },
      {
        label: 'Territorio',
        value: `${joinList(getTerritoryNames(project))} (${optionLabel(GEOGRAPHIC_SCOPE_OPTIONS, project.geographicScope).toLowerCase()})`,
      },
      {
        label: 'Coordinador/a',
        value: `${project.leadCoordinator.firstName} ${project.leadCoordinator.lastName}`,
      },
      { label: 'Período', value: `${project.startYear} a ${project.endYear ?? 'la actualidad'}` },
    ],
    extraFields: [
      { label: 'Contraparte', value: COUNTERPARTY_LABEL[project.counterpartyType] },
      {
        label: 'Líneas estratégicas',
        value: joinList(project.strategicLines.map(({ name }) => name)),
      },
      { label: 'Zona', value: optionLabel(ZONE_OPTIONS, project.zone) },
      { label: 'Ciudades', value: joinList(project.cities) },
      { label: 'Barrios', value: joinList(project.neighborhoods) },
      { label: 'Visible en la web', value: project.showOnLanding ? 'Sí' : 'No' },
    ],
    longFields: [{ label: 'Descripción pública', value: project.publicDescription ?? '' }].filter(
      ({ value }) => value.trim() !== ''
    ),
    kpis,
    categories:
      current &&
      categories
        .map(({ key, name }) => ({ label: name, value: current[key] ?? 0 }))
        .filter(({ value }) => value > 0),
  };

  return { status: 'success' as const, data };
}
