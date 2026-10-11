import { CounterpartyType, ProjectStatus, Intensity } from '@/generated/prisma/enums';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Activo',
  closed: 'Cerrado',
};

export const INTENSITY_LABEL: Record<Intensity, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const COUNTERPARTY_LABEL: Record<CounterpartyType, string> = {
  publicSector: 'Sector Público',
  privateSector: 'Sector Privado',
  internationalCooperation: 'Cooperación Internacional',
};

export const STATUS_OPTIONS = [
  { value: 'active', label: STATUS_LABEL.active },
  { value: 'closed', label: STATUS_LABEL.closed },
] as const;

export const INTENSITY_OPTIONS = [
  { value: 'high', label: INTENSITY_LABEL.high },
  { value: 'medium', label: INTENSITY_LABEL.medium },
  { value: 'low', label: INTENSITY_LABEL.low },
] as const;

export const COUNTERPARTY_OPTIONS = [
  { value: 'publicSector', label: COUNTERPARTY_LABEL.publicSector },
  { value: 'privateSector', label: COUNTERPARTY_LABEL.privateSector },
  { value: 'internationalCooperation', label: COUNTERPARTY_LABEL.internationalCooperation },
] as const;

export const SYSTEM_BENEFICIARY_KEYS = [
  'directChildrenAdolescents',
  'indirectChildrenAdolescents',
  'youth18To29',
  'families',
  'coordinatedInstitutions',
  'communityLeaders',
  'basicServiceStaff',
] as const;

export type SystemBeneficiaryKey = (typeof SYSTEM_BENEFICIARY_KEYS)[number];

export function isSystemBeneficiaryKey(key: string): key is SystemBeneficiaryKey {
  return (SYSTEM_BENEFICIARY_KEYS as readonly string[]).includes(key);
}

export type BeneficiaryCounts = Record<SystemBeneficiaryKey, number> & Record<string, number>;

export type BeneficiaryFieldName = SystemBeneficiaryKey | `custom${string}`;

export type BeneficiaryCategoryOption = { key: BeneficiaryFieldName; name: string };

export const TOPIC_OPTIONS = [
  { value: 'education', label: 'Educación' },
  { value: 'health', label: 'Salud' },
  { value: 'protection', label: 'Protección' },
  { value: 'community', label: 'Comunidad' },
  { value: 'employment', label: 'Empleo' },
] as const;

export const ZONE_OPTIONS = [
  { value: 'city', label: 'Montevideo' },
  { value: 'inland', label: 'Interior' },
  { value: 'border', label: 'Frontera' },
  { value: 'rural', label: 'Rural' },
] as const;

export const FIRST_PROJECT_YEAR = 1989;
export const PREVIEW_TOPIC_FALLBACK = 'Educación';
export const PREVIEW_LOCATION_FALLBACK = 'Montevideo';

export function sumBeneficiaries(counts: Record<string, number>) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

export function toBeneficiaryValuesCreate(counts: Partial<Record<string, number>>) {
  return Object.entries(counts).flatMap(([key, value]) =>
    value ? [{ value, category: { connect: { key } } }] : []
  );
}

export function formCategoryValuesWhere(projectId: number, year: number, keys: readonly string[]) {
  return {
    beneficiary: { projectId, year },
    category: { key: { in: [...keys] } },
  };
}
