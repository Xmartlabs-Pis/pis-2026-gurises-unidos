import { Image as PdfImage, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import { formatLongDate } from '@/lib/reports/format';
import type { ReportBar, ReportKpi } from '@/lib/reports/impact-report';

export const REPORT_FONT_FAMILY = 'Mulish';

export const INK = '#111111';
export const TEXT = '#262626';
export const MUTED = '#6b6b6b';
export const SUBTLE = '#8a8a8a';
export const RULE = '#e5e5e5';
const NOTICE_BACKGROUND = '#f3f3f3';
const BAR = '#1c1c1c';
const PAGE_GUTTER = 43;
const BAR_LABEL_WIDTH = 176;
const BAR_MAX_WIDTH = 250;

export const DESIGN_FIT = 1;

export const styles = StyleSheet.create({
  page: {
    fontFamily: REPORT_FONT_FAMILY,
    fontSize: 9.5,
    color: TEXT,
    paddingTop: 34,
    paddingBottom: 56,
    paddingHorizontal: PAGE_GUTTER,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    marginBottom: 26,
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 18, height: 18, borderRadius: 3 },
  brandName: { marginLeft: 8, fontSize: 9.5, fontWeight: 600, color: INK },
  headerLabel: { fontSize: 7.5, color: MUTED },
  title: { fontSize: 21, fontWeight: 700, color: INK },
  subtitle: { marginTop: 6, fontSize: 11, lineHeight: 1.45, color: TEXT },
  filters: { marginTop: 4, fontSize: 8, color: MUTED },
  notice: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: NOTICE_BACKGROUND,
    fontSize: 7.5,
    lineHeight: 1.5,
    color: MUTED,
  },
  kpiGrid: { marginTop: 20, borderTopWidth: 1, borderTopColor: RULE },
  kpiRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: RULE },
  kpiCell: { flex: 1, paddingVertical: 14, paddingRight: 12 },
  kpiCellDivided: { borderLeftWidth: 1, borderLeftColor: RULE, paddingLeft: 18 },
  kpiValue: { fontSize: 25, fontWeight: 700, color: INK },
  kpiLabel: { marginTop: 4, fontSize: 9, lineHeight: 1.35, color: TEXT },
  kpiDelta: { marginTop: 5, fontSize: 7, color: SUBTLE },
  section: { marginTop: 28 },
  sectionFirst: { marginTop: 0 },
  sectionTitle: { fontSize: 10.5, fontWeight: 600, color: INK, marginBottom: 10 },
  sectionNote: { marginTop: -4, marginBottom: 10, fontSize: 7, color: SUBTLE },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barLabel: { width: BAR_LABEL_WIDTH, paddingRight: 8, color: TEXT },
  bar: { backgroundColor: BAR },
  barValue: { marginLeft: 8, color: INK },
  divider: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: RULE },
  readingTitle: { fontSize: 8.5, fontWeight: 600, color: INK, marginBottom: 4 },
  readingLine: { fontSize: 7, lineHeight: 1.9, color: TEXT },
  footer: {
    position: 'absolute',
    left: PAGE_GUTTER,
    right: PAGE_GUTTER,
    bottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: RULE,
    fontSize: 7,
    color: SUBTLE,
  },
});

type ReportPageProps = {
  logo: Buffer;
  headerLabel: string;
  generatedAt: Date;
  children: ReactNode;
};

export function ReportPage({ logo, headerLabel, generatedAt, children }: ReportPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header} fixed>
        <View style={styles.brand}>
          <PdfImage src={{ data: logo, format: 'png' }} style={styles.logo} />
          <Text style={styles.brandName}>Gurises Unidos</Text>
        </View>
        <Text style={styles.headerLabel}>{headerLabel}</Text>
      </View>
      {children}
      <View style={styles.footer} fixed>
        <Text>Generado el {formatLongDate(generatedAt)} desde la plataforma de Gurises Unidos</Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <Text style={styles.notice}>{children}</Text>;
}

export function KpiGrid({ kpis, columns }: { kpis: ReportKpi[]; columns: number }) {
  const rows = Array.from({ length: Math.ceil(kpis.length / columns) }, (_, index) =>
    kpis.slice(index * columns, index * columns + columns)
  );

  return (
    <View style={styles.kpiGrid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.kpiRow} wrap={false}>
          {row.map((kpi, index) => (
            <View
              key={kpi.label}
              style={index === 0 ? styles.kpiCell : [styles.kpiCell, styles.kpiCellDivided]}
            >
              <Text style={styles.kpiValue}>{formatNumber(kpi.value)}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              {kpi.delta && <Text style={styles.kpiDelta}>{kpi.delta}</Text>}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function BarChart({ bars, fit = DESIGN_FIT }: { bars: ReportBar[]; fit?: number }) {
  const max = Math.max(1, ...bars.map(({ value }) => value));
  const row = [styles.barRow, { minHeight: 14 * fit, marginBottom: 10 * fit }];

  return (
    <View>
      {bars.map(({ label, value }) => (
        <View key={label} style={row} wrap={false}>
          <Text style={[styles.barLabel, { fontSize: 9 * fit }]}>{label}</Text>
          {value > 0 && (
            <View
              style={[
                styles.bar,
                { height: 9 * fit, width: Math.max(2, (value / max) * BAR_MAX_WIDTH) },
              ]}
            />
          )}
          <Text style={[styles.barValue, { fontSize: 8.5 * fit }]}>{formatNumber(value)}</Text>
        </View>
      ))}
    </View>
  );
}

type SectionProps = {
  title: string;
  note?: string;
  first?: boolean;
  children: ReactNode;
};

export function Section({ title, note, first, children }: SectionProps) {
  return (
    <View style={first ? [styles.section, styles.sectionFirst] : styles.section}>
      <View wrap={false}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note && <Text style={styles.sectionNote}>{note}</Text>}
      </View>
      {children}
    </View>
  );
}

export function ReadingGuide({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={styles.divider} wrap={false}>
      <Text style={styles.readingTitle}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.readingLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}
