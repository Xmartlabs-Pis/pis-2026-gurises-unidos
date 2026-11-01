import { ALL_FILTER_VALUE } from '@/lib/url-filters';
import type { ListedAuditAction, ListedAuditEntity } from '@/lib/validation/audit-log-filters';

export const AUDIT_ACTION_LABELS: Record<ListedAuditAction, string> = {
  creation: 'Creación',
  update: 'Edición',
  deletion: 'Borrado',
  loginFailure: 'Acceso fallido',
};

export const AUDIT_ACTION_CLASSNAMES: Record<ListedAuditAction, string> = {
  creation: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  deletion: 'bg-destructive/10 text-destructive',
  loginFailure: 'bg-destructive/10 text-destructive',
};

export const AUDIT_ACTION_TABS = [
  { value: ALL_FILTER_VALUE, label: 'Todas' },
  { value: 'creation', label: 'Creaciones' },
  { value: 'update', label: 'Ediciones' },
  { value: 'deletion', label: 'Borrados' },
  { value: 'loginFailure', label: 'Accesos fallidos' },
] as const;

export const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  status: 'Estado',
  intensity: 'Intensidad',
  counterpartyType: 'Contraparte',
  startYear: 'Año de inicio',
  endYear: 'Año de fin',
  leadCoordinatorId: 'Coordinador responsable',
  geographicScope: 'Alcance geográfico',
  countries: 'Países',
  departments: 'Departamentos',
  cities: 'Ciudades',
  neighborhoods: 'Barrios',
  localities: 'Ubicaciones',
  zone: 'Zona',
  generalObjective: 'Objetivo general',
  publicDescription: 'Descripción pública',
  coverPhoto: 'Foto de portada',
  internalNotes: 'Notas internas',
  showOnLanding: 'Visibilidad en la página pública',
  topics: 'Temáticas',
  strategicLines: 'Líneas estratégicas',
};

export const AUDIT_ENTITY_LABELS: Record<ListedAuditEntity, string> = {
  project: 'Proyecto',
  beneficiary: 'Beneficiarios',
  user: 'Usuario',
  authentication: 'Autenticación',
};

export const PROJECT_TEXT_CHANGE_LABELS: Record<string, string> = {
  generalObjective: 'modificado',
  publicDescription: 'modificada',
  internalNotes: 'modificadas',
};
