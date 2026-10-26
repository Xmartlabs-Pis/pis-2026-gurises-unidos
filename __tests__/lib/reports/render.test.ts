// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ImpactReportData } from '@/lib/reports/impact-report';
import type { ProjectSheetData } from '@/lib/reports/project-sheet';
import { countPages, renderImpactReport, renderProjectSheet } from '@/lib/reports/render';

const LONG_TEXT = 'acompañamiento territorial de adolescentes y familias '.repeat(40);
const DEPARTMENTS = Array.from({ length: 19 }, (_, index) => `Departamento ${index + 1}`);

const SHEET: ProjectSheetData = {
  year: 2026,
  isCurrentYear: true,
  generatedAt: new Date('2026-10-21T15:00:00Z'),
  name: 'El Resorte',
  description: 'Proyecto de acompañamiento territorial.',
  fields: [
    { label: 'Temática', value: 'Situación de calle' },
    { label: 'Estado', value: 'Activo' },
    { label: 'Intensidad', value: 'Alta' },
    { label: 'Territorio', value: 'Montevideo (nacional)' },
    { label: 'Coordinador/a', value: 'Ana García' },
    { label: 'Período', value: '2024 a la actualidad' },
  ],
  extraFields: [
    { label: 'Contraparte', value: 'Sector Público' },
    { label: 'Líneas estratégicas', value: 'Formación' },
    { label: 'Zona', value: 'Montevideo' },
    { label: 'Ciudades', value: 'Montevideo' },
    { label: 'Barrios', value: 'Cerro' },
    { label: 'Visible en la web', value: 'Sí' },
  ],
  longFields: [],
  kpis: [
    { value: 342, label: 'niños, niñas y adolescentes alcanzados', delta: null },
    { value: 60, label: 'familias acompañadas', delta: null },
    { value: 5, label: 'instituciones vinculadas', delta: null },
  ],
  categories: [
    { label: 'NNA directos', value: 342 },
    { label: 'Familias', value: 60 },
  ],
};

const REPORT: ImpactReportData = {
  year: 2026,
  generatedAt: new Date('2026-10-21T15:00:00Z'),
  projectCount: 27,
  pendingProjects: 3,
  kpis: [
    { value: 6315, label: 'niños, niñas y adolescentes alcanzados', delta: null },
    { value: 800, label: 'familias acompañadas', delta: null },
    { value: 4498, label: 'docentes y educadores capacitados', delta: null },
    { value: 27, label: 'proyectos activos', delta: null },
  ],
  topics: [{ label: 'Educación', value: 8 }],
  categories: [{ label: 'NNA directos', value: 3940 }],
  departments: [{ label: 'Montevideo', value: 9 }],
  departmentTotal: 19,
  internationalCountries: [],
};

describe('report rendering', () => {
  it('keeps the project sheet on one page even with every text field at its maximum', async () => {
    const pdf = await renderProjectSheet({
      ...SHEET,
      name: LONG_TEXT.slice(0, 100),
      description: LONG_TEXT.slice(0, 500),
      fields: SHEET.fields.map((field) =>
        field.label === 'Territorio' ? { ...field, value: DEPARTMENTS.join(', ') } : field
      ),
      longFields: [{ label: 'Descripción pública', value: LONG_TEXT.slice(0, 1000) }],
    });

    expect(countPages(pdf)).toBe(1);
  }, 30_000);

  it('keeps the impact report on two pages with many topics, categories and departments', async () => {
    const pdf = await renderImpactReport({
      ...REPORT,
      topics: Array.from({ length: 25 }, (_, index) => ({
        label: `Temática ${index + 1}`,
        value: 25 - index,
      })),
      categories: Array.from({ length: 12 }, (_, index) => ({
        label: `Categoría ${index + 1}`,
        value: 1000 * (12 - index),
      })),
      departments: DEPARTMENTS.map((label, index) => ({ label, value: 19 - index })),
    });

    expect(countPages(pdf)).toBe(2);
  }, 30_000);

  it('renders typical content at the designed page count', async () => {
    expect(countPages(await renderProjectSheet(SHEET))).toBe(1);
    expect(countPages(await renderImpactReport(REPORT))).toBe(2);
  }, 30_000);
});
