import { describe, expect, it } from 'vitest';
import { formatDelta, formatLongDate, toFileNameSegment } from '@/lib/reports/format';
import { getImpactReportFileName } from '@/lib/reports/impact-report';
import { getProjectSheetFileName } from '@/lib/reports/project-sheet';

describe('formatDelta', () => {
  it('formats a percentage change against the previous year', () => {
    expect(formatDelta(6315, 5836, 2025, 'percent')).toBe('+8,2 % frente a 2025 (5.836)');
    expect(formatDelta(90, 100, 2025, 'percent')).toBe('−10,0 % frente a 2025 (100)');
  });

  it('formats a count change against the previous year', () => {
    expect(formatDelta(27, 28, 2025, 'count')).toBe('1 menos que en 2025 (28)');
    expect(formatDelta(342, 324, 2025, 'count')).toBe('18 más que en 2025 (324)');
  });

  it('says when the value did not change', () => {
    expect(formatDelta(5, 5, 2025, 'count')).toBe('Igual que en 2025');
  });

  it('hides the change without previous data', () => {
    expect(formatDelta(5, null, 2025, 'percent')).toBeNull();
    expect(formatDelta(5, 0, 2025, 'count')).toBeNull();
  });
});

describe('report file names', () => {
  it('names the impact report after the year', () => {
    expect(getImpactReportFileName(2026)).toBe('Informe-de-impacto-2026.pdf');
  });

  it('names the project sheet after a safe version of the project name', () => {
    expect(getProjectSheetFileName('El Resorte', 2026)).toBe('Ficha-El-Resorte-2026.pdf');
    expect(getProjectSheetFileName('Niñez & Educación / Canelones', 2026)).toBe(
      'Ficha-Ninez-Educacion-Canelones-2026.pdf'
    );
    expect(toFileNameSegment('¿?')).toBe('');
    expect(getProjectSheetFileName('¿?', 2026)).toBe('Ficha-proyecto-2026.pdf');
  });
});

it('formats dates in Uruguayan Spanish', () => {
  expect(formatLongDate(new Date('2026-10-19T15:00:00Z'))).toBe('19 de octubre de 2026');
});
