import { Document, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatLongDate } from '@/lib/reports/format';
import type { ProjectSheetData, ReportField } from '@/lib/reports/project-sheet';
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

const sheetStyles = StyleSheet.create({
  fields: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
  fieldColumn: { width: '48%', borderTopWidth: 1, borderTopColor: RULE },
  fieldRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: RULE },
  fieldLabel: { width: 96, paddingRight: 8, color: MUTED },
  fieldValue: { flex: 1, fontWeight: 500, lineHeight: 1.3, color: INK },
  longFields: { marginTop: -1 },
  empty: { fontSize: 8.5, color: MUTED },
});

type FieldRowProps = ReportField & { fit: number; splittable?: boolean };

function FieldRow({ label, value, fit, splittable }: FieldRowProps) {
  return (
    <View style={[sheetStyles.fieldRow, { paddingVertical: 6.5 * fit }]} wrap={Boolean(splittable)}>
      <Text style={[sheetStyles.fieldLabel, { fontSize: 8.5 * fit }]}>{label}</Text>
      <Text style={[sheetStyles.fieldValue, { fontSize: 9 * fit }]}>{value}</Text>
    </View>
  );
}

function FieldTable({ data, fit }: { data: ProjectSheetData; fit: number }) {
  return (
    <>
      <View style={sheetStyles.fields}>
        {[data.fields, data.extraFields].map((column, index) => (
          <View key={index} style={sheetStyles.fieldColumn}>
            {column.map((field) => (
              <FieldRow key={field.label} {...field} fit={fit} />
            ))}
          </View>
        ))}
      </View>
      <View style={sheetStyles.longFields}>
        {data.longFields.map((field) => (
          <FieldRow key={field.label} {...field} fit={fit} splittable />
        ))}
      </View>
    </>
  );
}

type ProjectSheetDocumentProps = { data: ProjectSheetData; logo: Buffer; fit?: number };

export function ProjectSheetDocument({ data, logo, fit = DESIGN_FIT }: ProjectSheetDocumentProps) {
  return (
    <Document title={`Ficha de proyecto · ${data.name}`} author="Gurises Unidos" language="es">
      <ReportPage
        logo={logo}
        headerLabel={`Ficha de proyecto · ${data.year}`}
        generatedAt={data.generatedAt}
      >
        <Text style={[styles.title, { fontSize: 21 * fit }]}>{data.name}</Text>
        {data.description && (
          <Text style={[styles.subtitle, { fontSize: 11 * fit }]}>{data.description}</Text>
        )}
        {data.isCurrentYear && (
          <Notice>
            Año en curso: incluye los datos cargados hasta el {formatLongDate(data.generatedAt)}.
          </Notice>
        )}

        <FieldTable data={data} fit={fit} />

        {data.kpis && data.categories ? (
          <>
            <KpiGrid kpis={data.kpis} columns={3} />
            <Section
              title="Personas alcanzadas por categoría"
              note="Las instituciones no se suman al total de personas alcanzadas."
            >
              <BarChart bars={data.categories} />
            </Section>
          </>
        ) : (
          <Section title="Personas alcanzadas por categoría">
            <Text style={sheetStyles.empty}>
              El proyecto no tiene datos cargados en {data.year}.
            </Text>
          </Section>
        )}

        <ReadingGuide
          title="Cómo leer esta ficha"
          lines={[
            'NNA: niños, niñas y adolescentes.',
            'Las cifras son lo que el proyecto cargó en el año; no hay datos de personas individuales.',
            `La comparación es contra el mismo período de ${data.year - 1}.`,
          ]}
        />
      </ReportPage>
    </Document>
  );
}
