import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postImpactReport } from '@/app/api/reports/impact/route';
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

function impactRequest(body: unknown = { year: 2026, projectIds: [1] }) {
  return postImpactReport(
    new NextRequest('http://localhost/api/reports/impact', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
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

  it('downloads the impact report of the selected projects for the requested year', async () => {
    vi.mocked(getImpactReportData).mockResolvedValue({ year: 2025 } as never);

    const response = await impactRequest({ year: 2025, projectIds: [3, 8, 3] });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('Informe-de-impacto-2025.pdf');
    expect(getImpactReportData).toHaveBeenCalledWith([3, 8], 2025);
  });

  it('lets a coordinator export projects they do not lead', async () => {
    vi.mocked(getActiveUser).mockResolvedValue({ ...ADMIN, id: 7, role: 'coordinator' });
    vi.mocked(getImpactReportData).mockResolvedValue({ year: 2026 } as never);

    const response = await impactRequest({ year: 2026, projectIds: [42] });

    expect(response.status).toBe(200);
    expect(getImpactReportData).toHaveBeenCalledWith([42], 2026);
  });

  it('falls back to the current year when the requested one has no data', async () => {
    vi.mocked(getImpactReportData).mockResolvedValue(null);

    await impactRequest({ year: 1999, projectIds: [1] });
    await impactRequest({ projectIds: [1] });

    expect(vi.mocked(getImpactReportData).mock.calls.map(([, year]) => year)).toEqual([2026, 2026]);
  });

  it.each([
    { year: 2026, projectIds: [] },
    { year: 2026, projectIds: [0] },
    { year: 2026 },
    'nope',
  ])('rejects an invalid project selection %#', async (body) => {
    const response = await impactRequest(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: 'Seleccioná al menos un proyecto para exportar el reporte.',
    });
    expect(getImpactReportData).not.toHaveBeenCalled();
  });

  it('warns instead of generating an empty impact report', async () => {
    vi.mocked(getImpactReportData).mockResolvedValue(null);

    const response = await impactRequest();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: 'Los proyectos seleccionados no tienen datos cargados en el año elegido.',
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
