import type { MetricValues } from '@/lib/metrics/queries';

export const METRIC_DEFINITIONS: {
  key: keyof MetricValues;
  name: string;
  description: string;
  showPublicly: boolean;
}[] = [
  {
    key: 'direct_children_reached',
    name: 'NNA directos',
    description: 'Niños, niñas y adolescentes alcanzados con acciones directas.',
    showPublicly: true,
  },
  {
    key: 'indirect_children_reached',
    name: 'NNA indirectos',
    description: 'Niños, niñas y adolescentes alcanzados con acciones indirectas.',
    showPublicly: true,
  },
  {
    key: 'families',
    name: 'Familias acompañadas',
    description: 'Familias con acompañamiento directo durante el año.',
    showPublicly: false,
  },
  {
    key: 'teachers',
    name: 'Funcionarios de servicios básicos',
    description: 'Funcionarios de servicios básicos formados por la organización.',
    showPublicly: false,
  },
  {
    key: 'institutions',
    name: 'Instituciones vinculadas',
    description: 'Organizaciones coordinadas en el territorio.',
    showPublicly: false,
  },
  {
    key: 'active_projects',
    name: 'Proyectos con actividad',
    description: 'Proyectos con beneficiarios registrados durante el año seleccionado.',
    showPublicly: true,
  },
];
