import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getImpactReport } from '@/app/api/reports/impact/route';
import { GET as getProjectSheet } from '@/app/api/reports/projects/[id]/route';
import { getActiveUser } from '@/lib/auth/require-user';
import { getImpactReportData } from '@/lib/reports/impact-report';
import { getProjectSheetData } from '@/lib/reports/project-sheet';

vi.mock('@/lib/auth/require-user', () => ({ getActiveUser: vi.fn() }));
vi.mock('@/lib/metrics/queries', () => ({ getMetricYears: async () => [2026, 2025] }));
vi.mock('@/lib/metrics/year', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/metrics/year')>()),
  getCurrentYear: () => 2026,
}));
vi.mock('@/lib/reports/render', () => ({
  renderImpactReport: async () => Buffer.from('%PDF'),
  renderProjectSheet: async () => Buffer.from('%PDF'),
}));
vi.mock('@/lib/reports/impact-report', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/reports/impact-report')>()),
  getImpactReportData: vi.fn(),
}));
vi.mock('@/lib/reports/project-sheet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/reports/project-sheet')>()),
  getProjectSheetData: vi.fn(),
}));

const ADMIN = { id: 1, role: 'admin', status: 'active', deletedAt: null } as const;

function impactRequest(query = '') {
  return getImpactReport(new NextRequest(`http://localhost/api/reports/impact${query}`));
}

function sheetRequest(id: string, headers?: HeadersInit, query = '') {
  return getProjectSheet(
    new NextRequest(`http://localhost/api/reports/projects/${id}${query}`, { headers }),
    { params: Promise.resolve({ id }) }
  );
}

describe('report routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveUser).mockResolvedValue(ADMIN);
  });

  it('rejects requests without a session', async () => {
    vi.mocked(getActiveUser).mockResolvedValue(null);

    expect((await impactRequest()).status).toBe(401);
    expect((await sheetRequest('1')).status).toBe(401);
  });

  it('downloads the impact report of the requested year', async () => {
    vi.mocked(getImpactReportData).mockResolvedValue({ year: 2025 } as never);

    const response = await impactRequest('?year=2025&topicId=3');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('Informe-de-impacto-2025.pdf');
    expect(getImpactReportData).toHaveBeenCalledWith(ADMIN, 2025);
  });

  it('warns instead of generating an empty impact report', async () => {
    vi.mocked(getImpactReportData).mockResolvedValue(null);

    const response = await impactRequest('?year=2026');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: 'No hay datos cargados en el año elegido para exportar.',
    });
  });

  it('denies the sheet of a project the coordinator does not lead', async () => {
    vi.mocked(getProjectSheetData).mockResolvedValue({ status: 'forbidden' });

    expect((await sheetRequest('5')).status).toBe(403);
  });

  it('sends browser navigations to the error screen instead of returning JSON', async () => {
    vi.mocked(getProjectSheetData).mockResolvedValue({ status: 'forbidden' });

    const response = await sheetRequest('5', { 'Sec-Fetch-Dest': 'document' });

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe(
      'http://localhost/dashboard/report-error?reason=projectForbidden'
    );
  });

  it('returns not found for unknown or invalid projects', async () => {
    vi.mocked(getProjectSheetData).mockResolvedValue({ status: 'notFound' });

    expect((await sheetRequest('5')).status).toBe(404);
    expect((await sheetRequest('abc')).status).toBe(404);
  });

  it('exports the sheet of the requested year and falls back to the current one', async () => {
    vi.mocked(getProjectSheetData).mockResolvedValue({ status: 'notFound' });

    await sheetRequest('5', undefined, '?year=2024');
    await sheetRequest('5', undefined, '?year=abc');
    await sheetRequest('5');

    expect(vi.mocked(getProjectSheetData).mock.calls.map(([, , year]) => year)).toEqual([
      2024, 2026, 2026,
    ]);
  });

  it('downloads the project sheet', async () => {
    vi.mocked(getProjectSheetData).mockResolvedValue({
      status: 'success',
      data: { name: 'El Resorte', year: 2026 } as never,
    });

    const response = await sheetRequest('5');

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Report-File-Name')).toBe('Ficha-El-Resorte-2026.pdf');
  });
});
