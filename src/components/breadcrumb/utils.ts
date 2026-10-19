const RESOURCE_SEGMENTS = new Set(['projects', 'users']);

const RESOURCES_WITHOUT_DETAIL_PAGE = new Set(['users']);

const HIDDEN_SEGMENTS = new Set(['management']);

const STATIC_SEGMENTS = new Set([
  'dashboard',
  'projects',
  'users',
  'management',
  'topics',
  'beneficiary-categories',
  'strategic-lines',
  'new',
  'edit',
]);

export const BREADCRUMB_SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  metrics: 'Métricas',
  projects: 'Proyectos',
  users: 'Usuarios',
  topics: 'Temáticas',
  profile: 'Perfil',
  'beneficiary-categories': 'Categorías de beneficiarios',
  'strategic-lines': 'Líneas estratégicas',
  new: 'Nuevo',
  edit: 'Editar',
};

export function formatBreadcrumbSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return decoded
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isResourceId(segment: string, parent: string | undefined): boolean {
  return Boolean(parent && RESOURCE_SEGMENTS.has(parent) && !STATIC_SEGMENTS.has(segment));
}

function getSegmentLabel(segment: string, segments: string[], index: number): string {
  if (BREADCRUMB_SEGMENT_LABELS[segment]) {
    return BREADCRUMB_SEGMENT_LABELS[segment];
  }

  if (isResourceId(segment, segments[index - 1])) {
    return 'Detalles';
  }

  return formatBreadcrumbSegment(segment);
}

export type BreadcrumbCrumb = { href: string; label: string; isResource: boolean };

export function getBreadcrumbsFromPathname(pathname: string): BreadcrumbCrumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbCrumb[] = [];
  let href = '';

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    href += `/${segment}`;

    if (HIDDEN_SEGMENTS.has(segment)) {
      continue;
    }

    const parent = segments[index - 1];
    const isResource = isResourceId(segment, parent);

    if (isResource && segments[index + 1] === 'edit' && RESOURCES_WITHOUT_DETAIL_PAGE.has(parent)) {
      continue;
    }

    crumbs.push({ href, label: getSegmentLabel(segment, segments, index), isResource });
  }

  return crumbs;
}
