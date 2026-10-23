import { Document, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatNumber } from '@/lib/format';
import { formatLongDate } from '@/lib/reports/format';
import type { ImpactReportData, ReportBar } from '@/lib/reports/impact-report';
import {
  BarChart,
  DESIGN_FIT,
  INK,
  KpiGrid,
  MUTED,
  Notice,
  ReadingGuide,
  ReportPage,
  RULE,
  Section,
  styles,
} from './report-primitives';

const tableStyles = StyleSheet.create({
  columns: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: '47%' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  value: { color: INK },
  international: { color: MUTED },
});

function DepartmentTable({ departments, fit }: { departments: ReportBar[]; fit: number }) {
  const half = Math.ceil(departments.length / 2);
  const columns = [departments.slice(0, half), departments.slice(half)];
  const row = [tableStyles.row, { paddingVertical: 6 * fit, fontSize: 9 * fit }];

  return (
    <View style={tableStyles.columns}>
      {columns.map((column, index) => (
        <View key={index} style={tableStyles.column}>
          {column.map(({ label, value }) => (
            <View key={label} style={row} wrap={false}>
              <Text>{label}</Text>
              <Text style={tableStyles.value}>{formatNumber(value)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function pluralize(count: number, singular: string, plural: string) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function getCurrentYearNotice(generatedAt: Date, pendingProjects: number) {
  const cutoff = `Año en curso: incluye las cargas aprobadas hasta el ${formatLongDate(generatedAt)}.`;
  if (pendingProjects === 0) return cutoff;
  const pending =
    pendingProjects === 1
      ? '1 proyecto todavía no cargó sus datos.'
      : `${formatNumber(pendingProjects)} proyectos todavía no cargaron sus datos.`;
  return `${cutoff} ${pending}`;
}

type ImpactPageProps = { data: ImpactReportData; logo: Buffer; fit?: number };

function getPageProps({ data, logo }: ImpactPageProps) {
  return { logo, headerLabel: `Informe de impacto ${data.year}`, generatedAt: data.generatedAt };
}

function ImpactOverviewPage({ data, logo, fit = DESIGN_FIT }: ImpactPageProps) {
  const projects = pluralize(data.projectCount, 'proyecto', 'proyectos');

  return (
    <ReportPage {...getPageProps({ data, logo })}>
      <Text style={styles.title}>Informe de impacto {data.year}</Text>
      <Text style={styles.subtitle}>
        Lo que {data.projectCount === 1 ? 'hizo el' : 'hicieron los'} {projects} de Gurises Unidos
        en {data.year}.
      </Text>
      {data.appliedFilters.length > 0 && (
        <Text style={styles.filters}>Filtros aplicados: {data.appliedFilters.join(' · ')}</Text>
      )}
      {data.pendingProjects !== null && (
        <Notice>{getCurrentYearNotice(data.generatedAt, data.pendingProjects)}</Notice>
      )}

      <KpiGrid kpis={data.kpis} columns={2} />

      <Section title="1) Proyectos por temática">
        {data.topics.length > 0 ? (
          <BarChart bars={data.topics} fit={fit} />
        ) : (
          <Text style={styles.sectionNote}>Los proyectos no tienen temáticas asignadas.</Text>
        )}
      </Section>
    </ReportPage>
  );
}

function ImpactDetailsPage({ data, logo, fit = DESIGN_FIT }: ImpactPageProps) {
  return (
    <ReportPage {...getPageProps({ data, logo })}>
      <Section
        first
        title="2) Personas alcanzadas por categoría"
        note="Las instituciones no se suman al total de personas alcanzadas."
      >
        <BarChart bars={data.categories} fit={fit} />
      </Section>

      <Section
        title="3) Dónde trabajamos"
        note={`Proyectos activos por departamento. ${data.departments.length} de los ${data.departmentTotal} departamentos.`}
      >
        <DepartmentTable departments={data.departments} fit={fit} />
        {data.internationalCountries.length > 0 && (
          <Text style={[tableStyles.international, { marginTop: 10 * fit, fontSize: 8 * fit }]}>
            Fuera de Uruguay: {data.internationalCountries.join(', ')}.
          </Text>
        )}
      </Section>

      <ReadingGuide
        title="Cómo leer este informe"
        lines={[
          'NNA: niños, niñas y adolescentes.',
          'Las cifras son la suma de lo que carga cada proyecto en el año; no hay datos de personas individuales.',
          `La comparación es contra el mismo período de ${data.year - 1}.`,
        ]}
      />
    </ReportPage>
  );
}

export function ImpactReportDocument({
  data,
  logo,
  fits = { overview: DESIGN_FIT, details: DESIGN_FIT },
  pages = ['overview', 'details'],
}: {
  data: ImpactReportData;
  logo: Buffer;
  fits?: Record<ImpactPage, number>;
  pages?: ImpactPage[];
}) {
  return (
    <Document title={`Informe de impacto ${data.year}`} author="Gurises Unidos" language="es">
      {pages.includes('overview') && (
        <ImpactOverviewPage data={data} logo={logo} fit={fits.overview} />
      )}
      {pages.includes('details') && (
        <ImpactDetailsPage data={data} logo={logo} fit={fits.details} />
      )}
    </Document>
  );
}

export type ImpactPage = 'overview' | 'details';
