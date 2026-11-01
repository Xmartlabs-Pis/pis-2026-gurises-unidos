import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PublishedYearsSelect } from '@/components/metrics/published-years-select';

const YEARS = Array.from({ length: 15 }, (_, index) => 2026 - index);

afterEach(() => vi.unstubAllGlobals());

test.each([
  { wide: true, perPage: 6 },
  { wide: false, perPage: 4 },
])('reveals two rows at a time with wide=$wide', ({ wide, perPage }) => {
  vi.stubGlobal('matchMedia', () => ({
    matches: wide,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  render(
    <PublishedYearsSelect years={YEARS} selectedYears={[2026]} onSelectedYearsChange={vi.fn()} />
  );
  expect(screen.getAllByRole('checkbox')).toHaveLength(perPage);
  let visibleCount = perPage;
  while (visibleCount < YEARS.length) {
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    visibleCount = Math.min(visibleCount + perPage, YEARS.length);
    expect(screen.getAllByRole('checkbox')).toHaveLength(visibleCount);
  }
  expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
});

test('selects all years including hidden options and preserves them when loading more', () => {
  function YearSelection() {
    const [selectedYears, setSelectedYears] = useState([2026]);
    return (
      <PublishedYearsSelect
        years={YEARS}
        selectedYears={selectedYears}
        onSelectedYearsChange={setSelectedYears}
      />
    );
  }
  render(<YearSelection />);
  fireEvent.click(screen.getByRole('switch', { name: 'Publicar todos los años' }));
  expect(screen.getByRole('status').textContent).toContain('15 años seleccionados');
  expect(screen.getAllByRole('checkbox')).toHaveLength(6);
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
  const checkboxes = screen.getAllByRole('checkbox');
  expect(checkboxes).toHaveLength(12);
  for (const checkbox of checkboxes) {
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
  }
});

test('omits the load button when all years already fit in two rows', () => {
  render(
    <PublishedYearsSelect
      years={[2026, 2025, 2005]}
      selectedYears={[2026]}
      onSelectedYearsChange={vi.fn()}
    />
  );
  expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
});
