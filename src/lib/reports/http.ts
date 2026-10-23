export const REPORT_FILE_NAME_HEADER = 'X-Report-File-Name';

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

export function reportErrorResponse(status: number, message: string) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
