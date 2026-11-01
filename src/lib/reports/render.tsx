import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import {
  ImpactReportDocument,
  type ImpactPage,
} from '@/components/reports/pdf/impact-report-document';
import { ProjectSheetDocument } from '@/components/reports/pdf/project-sheet-document';
import { REPORT_FONT_FAMILY } from '@/components/reports/pdf/report-primitives';
import type { ImpactReportData } from '@/lib/reports/impact-report';
import type { ProjectSheetData } from '@/lib/reports/project-sheet';

const ASSETS_DIR = path.join(process.cwd(), 'public', 'reports');
const FONT_WEIGHTS = [400, 500, 600, 700];
const MAX_UNBROKEN_WORD_LENGTH = 24;
const WORD_CHUNK_LENGTH = 12;
const FIT_STEPS = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52];
const PAGE_COUNT_PATTERN = /\/Type\s*\/Pages\s*\/Count\s+(\d+)/;

Font.register({
  family: REPORT_FONT_FAMILY,
  fonts: FONT_WEIGHTS.map((fontWeight) => ({
    src: path.join(ASSETS_DIR, 'fonts', `mulish-${fontWeight}.woff`),
    fontWeight,
  })),
});
Font.registerHyphenationCallback((word) =>
  word.length > MAX_UNBROKEN_WORD_LENGTH
    ? (word.match(new RegExp(`.{1,${WORD_CHUNK_LENGTH}}`, 'gu')) ?? [word])
    : [word]
);

let logoPromise: Promise<Buffer> | undefined;

function getLogo() {
  logoPromise ??= readFile(path.join(ASSETS_DIR, 'logo.png'));
  return logoPromise;
}

export function countPages(pdf: Buffer) {
  return Number(pdf.toString('latin1').match(PAGE_COUNT_PATTERN)?.[1] ?? 0);
}

async function findFit(render: (fit: number) => Promise<Buffer>, maxPages: number) {
  let pdf: Buffer | undefined;
  for (const fit of FIT_STEPS) {
    pdf = await render(fit);
    if (countPages(pdf) <= maxPages) return { fit, pdf };
  }
  return { fit: FIT_STEPS[FIT_STEPS.length - 1], pdf: pdf! };
}

export async function renderImpactReport(data: ImpactReportData) {
  const logo = await getLogo();
  const fitPage = (page: ImpactPage) =>
    findFit(
      (fit) =>
        renderToBuffer(
          <ImpactReportDocument
            data={data}
            logo={logo}
            pages={[page]}
            fits={{ overview: fit, details: fit }}
          />
        ),
      1
    );
  const [overview, details] = await Promise.all([fitPage('overview'), fitPage('details')]);

  return renderToBuffer(
    <ImpactReportDocument
      data={data}
      logo={logo}
      fits={{ overview: overview.fit, details: details.fit }}
    />
  );
}

export async function renderProjectSheet(data: ProjectSheetData) {
  const logo = await getLogo();
  const { pdf } = await findFit(
    (fit) => renderToBuffer(<ProjectSheetDocument data={data} logo={logo} fit={fit} />),
    1
  );
  return pdf;
}
