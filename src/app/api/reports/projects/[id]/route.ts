import type { NextRequest } from 'next/server';
import { getActiveUser } from '@/lib/auth/require-user';
import { getCurrentYear } from '@/lib/metrics/year';
import { pdfResponse, reportErrorResponse } from '@/lib/reports/http';
import { getProjectSheetData, getProjectSheetFileName } from '@/lib/reports/project-sheet';
import { renderProjectSheet } from '@/lib/reports/render';
import { parseId } from '@/lib/validation/ids';
import { parseProjectDetailInput } from '@/lib/validation/project-detail';

export async function GET(request: NextRequest, ctx: RouteContext<'/api/reports/projects/[id]'>) {
  const user = await getActiveUser();
  if (!user) return reportErrorResponse(request, 'unauthorized');

  const projectId = parseId((await ctx.params).id);
  if (!projectId) return reportErrorResponse(request, 'projectNotFound');

  const currentYear = getCurrentYear();
  const rawYear = request.nextUrl.searchParams.get('year') ?? undefined;
  const parsed = parseProjectDetailInput(projectId, rawYear, currentYear);
  const year = (parsed.success && parsed.data.year) || currentYear;

  const result = await getProjectSheetData(user, projectId, year);
  if (result.status === 'notFound') return reportErrorResponse(request, 'projectNotFound');
  if (result.status === 'forbidden') return reportErrorResponse(request, 'projectForbidden');

  const { data } = result;
  return pdfResponse(await renderProjectSheet(data), getProjectSheetFileName(data.name, data.year));
}
