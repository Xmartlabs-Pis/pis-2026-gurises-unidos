import type { NextRequest } from 'next/server';
import { getActiveUser } from '@/lib/auth/require-user';
import { canExportReports } from '@/lib/projects/permissions';
import { pdfResponse, reportErrorResponse } from '@/lib/reports/http';
import { getProjectSheetData, getProjectSheetFileName } from '@/lib/reports/project-sheet';
import { renderProjectSheet } from '@/lib/reports/render';
import { parseId } from '@/lib/validation/ids';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/reports/projects/[id]'>) {
  const user = await getActiveUser();
  if (!user) return reportErrorResponse(401, 'Tu sesión expiró. Volvé a iniciar sesión.');
  if (!canExportReports(user)) {
    return reportErrorResponse(403, 'No tenés permisos para exportar reportes.');
  }

  const projectId = parseId((await ctx.params).id);
  const result = projectId ? await getProjectSheetData(user, projectId) : null;
  if (!result || result.status === 'notFound') {
    return reportErrorResponse(404, 'No encontramos el proyecto.');
  }
  if (result.status === 'forbidden') {
    return reportErrorResponse(
      403,
      'Solo podés exportar las fichas de los proyectos que coordinás.'
    );
  }

  const { data } = result;
  return pdfResponse(await renderProjectSheet(data), getProjectSheetFileName(data.name, data.year));
}
