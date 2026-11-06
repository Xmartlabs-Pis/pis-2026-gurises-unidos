import type { NextRequest } from 'next/server';
import { getActiveUser } from '@/lib/auth/require-user';
import { getMetricYears } from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';
import { pdfResponse, reportErrorResponse } from '@/lib/reports/http';
import { getImpactReportData, getImpactReportFileName } from '@/lib/reports/impact-report';
import { renderImpactReport } from '@/lib/reports/render';
import { impactReportRequestSchema } from '@/lib/validation/impact-report';

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  if (!user) return reportErrorResponse(request, 'unauthorized');

  const parsed = impactReportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reportErrorResponse(request, 'invalidSelection');

  const currentYear = getCurrentYear();
  const rawYear = parsed.data.year?.toString();
  const year = resolveYearParam(rawYear, await getMetricYears(currentYear), currentYear);
  const data = await getImpactReportData(parsed.data.projectIds, year);
  if (!data) return reportErrorResponse(request, 'emptyReport');

  return pdfResponse(await renderImpactReport(data), getImpactReportFileName(year));
}
