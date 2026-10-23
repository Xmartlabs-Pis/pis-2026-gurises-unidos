import type { NextRequest } from 'next/server';
import { getActiveUser } from '@/lib/auth/require-user';
import { getMetricYears } from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';
import { pdfResponse, reportErrorResponse } from '@/lib/reports/http';
import { getImpactReportData, getImpactReportFileName } from '@/lib/reports/impact-report';
import { renderImpactReport } from '@/lib/reports/render';

export async function GET(request: NextRequest) {
  const user = await getActiveUser();
  if (!user) return reportErrorResponse(request, 'unauthorized');

  const currentYear = getCurrentYear();
  const rawYear = request.nextUrl.searchParams.get('year') ?? undefined;
  const year = resolveYearParam(rawYear, await getMetricYears(currentYear), currentYear);
  const data = await getImpactReportData(user, year);
  if (!data) return reportErrorResponse(request, 'emptyReport');

  return pdfResponse(await renderImpactReport(data), getImpactReportFileName(year));
}
