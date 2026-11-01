export const REPORT_FILE_NAME_HEADER = 'X-Report-File-Name';

export const REPORT_ERROR_PATH = '/dashboard/report-error';

export const REPORT_ERRORS = {
  unauthorized: {
    status: 401,
    title: 'Sesión expirada',
    message: 'Tu sesión expiró. Volvé a iniciar sesión.',
  },
  projectForbidden: {
    status: 403,
    title: 'Acceso denegado',
    message: 'Solo podés exportar las fichas de los proyectos que coordinás.',
  },
  projectNotFound: {
    status: 404,
    title: 'Proyecto no encontrado',
    message: 'No encontramos el proyecto.',
  },
  emptyReport: {
    status: 404,
    title: 'Sin datos para exportar',
    message: 'No hay datos cargados en el año elegido para exportar.',
  },
} as const;

export type ReportErrorReason = keyof typeof REPORT_ERRORS;

export function isReportErrorReason(value: unknown): value is ReportErrorReason {
  return typeof value === 'string' && Object.hasOwn(REPORT_ERRORS, value);
}

export function pdfResponse(buffer: Buffer, fileName: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      [REPORT_FILE_NAME_HEADER]: fileName,
    },
  });
}

export function reportErrorResponse(request: Request, reason: ReportErrorReason) {
  if (request.headers.get('Sec-Fetch-Dest') === 'document') {
    const url = new URL(REPORT_ERROR_PATH, request.url);
    url.searchParams.set('reason', reason);
    return Response.redirect(url, 303);
  }

  const { status, message } = REPORT_ERRORS[reason];
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
