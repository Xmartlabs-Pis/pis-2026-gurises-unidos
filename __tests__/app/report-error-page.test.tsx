import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import ReportErrorPage from '@/app/(protected)/dashboard/report-error/page';

async function renderPage(reason?: string) {
  render(await ReportErrorPage({ searchParams: Promise.resolve({ reason }) }));
}

test('explains why the project sheet could not be exported', async () => {
  await renderPage('projectNotFound');

  expect(screen.getByText('404')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Proyecto no encontrado' })).toBeDefined();
  expect(screen.getByText('No encontramos el proyecto.')).toBeDefined();
});

test('falls back to the not found screen for unknown reasons', async () => {
  await renderPage('toString');

  expect(screen.getByText('404')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeDefined();
});
