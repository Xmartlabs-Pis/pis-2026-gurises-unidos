export const ADMIN = {
  firstName: 'Ana',
  lastName: 'Admin',
  documentId: '11111111',
  email: 'admin@gurisesunidos.test',
  role: 'admin',
  status: 'active',
} as const;

export const TABLES = [
  'ProjectCoordinator',
  'ProjectBeneficiaryValue',
  'ProjectBeneficiary',
  'BeneficiaryCategory',
  'AuditLog',
  'Report',
  'Metric',
  'PublicSettings',
  'Project',
  'StrategicLine',
  'User',
  'Topic',
  'Department',
];

export const BENEFICIARY_CATEGORIES = [
  { key: 'directChildrenAdolescents', name: 'NNA directos' },
  { key: 'indirectChildrenAdolescents', name: 'NNA indirectos' },
  { key: 'youth18To29', name: 'Jóvenes (18 a 29)' },
  { key: 'families', name: 'Familias' },
  { key: 'coordinatedInstitutions', name: 'Instituciones coordinadas' },
  { key: 'communityLeaders', name: 'Referentes comunitarios' },
  { key: 'basicServiceStaff', name: 'Personal de servicios básicos' },
].map((category, index) => ({ ...category, sortOrder: index + 1, isSystem: true }));

export const STRATEGIC_LINES = [
  'Atención Directa',
  'Incidencia en Políticas Públicas',
  'Redes Interinstitucionales',
  'Difusión y Sensibilización',
  'Investigación y Sistematización',
  'Formación',
] as const;
