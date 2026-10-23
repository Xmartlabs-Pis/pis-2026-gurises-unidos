import type { NextRequest } from 'next/server';
import { getActiveUser } from '@/lib/auth/require-user';
import { canExportReports } from '@/lib/projects/permissions';
import { pdfResponse, reportErrorResponse } from '@/lib/reports/http';
import { getProjectSheetData, getProjectSheetFileName } from '@/lib/reports/project-sheet';
import { renderProjectSheet } from '@/lib/reports/render';
import { parseId } from '@/lib/validation/ids';

export async function GET(request: NextRequest, ctx: RouteContext<'/api/reports/projects/[id]'>) {
  const user = await getActiveUser();
  if (!user) return reportErrorResponse(request, 'unauthorized');
  if (!canExportReports(user)) return reportErrorResponse(request, 'roleForbidden');

  const projectId = parseId((await ctx.params).id);
  const result = projectId ? await getProjectSheetData(user, projectId) : null;
  if (!result || result.status === 'notFound') {
    return reportErrorResponse(request, 'projectNotFound');
  }
  if (result.status === 'forbidden') return reportErrorResponse(request, 'projectForbidden');

  const { data } = result;
  return pdfResponse(await renderProjectSheet(data), getProjectSheetFileName(data.name, data.year));
}
