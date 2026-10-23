import type { NextRequest } from 'next/server';
import { getActiveUser } from '@/lib/auth/require-user';
import { getMetricYears } from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';
import { canExportReports } from '@/lib/projects/permissions';
import { pdfResponse, reportErrorResponse } from '@/lib/reports/http';
import { getImpactReportData, getImpactReportFileName } from '@/lib/reports/impact-report';
import { renderImpactReport } from '@/lib/reports/render';

export async function GET(request: NextRequest) {
  const user = await getActiveUser();
  if (!user) return reportErrorResponse(request, 'unauthorized');
  if (!canExportReports(user)) return reportErrorResponse(request, 'roleForbidden');

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const currentYear = getCurrentYear();
  const year = resolveYearParam(params.year, await getMetricYears(currentYear), currentYear);
  const data = await getImpactReportData(user, year, params);
  if (!data) return reportErrorResponse(request, 'emptyReport');

  return pdfResponse(await renderImpactReport(data), getImpactReportFileName(year));
}
