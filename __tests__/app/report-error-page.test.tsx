import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import ReportErrorPage from '@/app/(protected)/dashboard/report-error/page';

async function renderPage(reason?: string) {
  render(await ReportErrorPage({ searchParams: Promise.resolve({ reason }) }));
}

test('explains why the project sheet could not be exported', async () => {
  await renderPage('projectForbidden');

  expect(screen.getByText('403')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeDefined();
  expect(
    screen.getByText('Solo podés exportar las fichas de los proyectos que coordinás.')
  ).toBeDefined();
});

test('falls back to the not found screen for unknown reasons', async () => {
  await renderPage('toString');

  expect(screen.getByText('404')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeDefined();
});
