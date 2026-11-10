import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DepartmentExplorer } from '@/components/map/department-explorer';
import type { PublicDepartment } from '@/lib/projects/public-projects';

vi.mock('@/components/map/uruguay-map-loader', () => ({
  UruguayMapLoader: ({ selectedDepartment }: { selectedDepartment: string }) => (
    <div aria-label="Selected department">{selectedDepartment}</div>
  ),
}));

vi.mock('@/components/map/geography-project-carousel', () => ({
  GeographyProjectCarousel: ({ name }: { name: string }) => <h3>{name}</h3>,
}));

function department(id: number, name: string, projectCount: number): PublicDepartment {
  return {
    id,
    name,
    projects: Array.from({ length: projectCount }, (_, index) => ({
      id: index + 1,
      name: `Project ${index + 1}`,
      territory: name,
      description: '',
      coverPhoto: null,
      coverCrop: null,
      reach: 10,
    })),
  };
}

test.each([
  {
    name: 'prefers Montevideo when it has projects even if another department has more',
    departments: [department(1, 'Canelones', 5), department(2, 'Montevideo', 1)],
    expected: 'Montevideo',
  },
  {
    name: 'selects the busiest department when Montevideo has no projects',
    departments: [
      department(1, 'Canelones', 1),
      department(2, 'Montevideo', 0),
      department(3, 'Salto', 4),
    ],
    expected: 'Salto',
  },
  {
    name: 'selects the busiest department when Montevideo is absent',
    departments: [department(1, 'Canelones', 1), department(3, 'Salto', 4)],
    expected: 'Salto',
  },
  {
    name: 'falls back to Montevideo when all departments have no projects',
    departments: [department(1, 'Artigas', 0), department(2, 'Montevideo', 0)],
    expected: 'Montevideo',
  },
])('$name', ({ departments, expected }) => {
  render(<DepartmentExplorer year={2026} departments={departments} />);

  if (departments.some(({ name, projects }) => name === expected && projects.length > 0)) {
    expect(screen.getByRole('button', { name: expected }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  } else {
    expect(screen.queryByRole('button', { name: expected })).toBeNull();
  }
  expect(screen.getByRole('heading', { name: expected })).toBeDefined();
  expect(screen.getByLabelText('Selected department').textContent).toBe(expected);
});

test('allows selecting a different department after the initial selection', () => {
  render(
    <DepartmentExplorer
      year={2026}
      departments={[department(1, 'Canelones', 1), department(2, 'Montevideo', 2)]}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Canelones' }));

  expect(screen.getByRole('button', { name: 'Canelones' }).getAttribute('aria-pressed')).toBe(
    'true'
  );
  expect(screen.getByRole('heading', { name: 'Canelones' })).toBeDefined();
  expect(screen.getByLabelText('Selected department').textContent).toBe('Canelones');
});

test.each([
  {
    departments: [department(1, 'Canelones', 0), department(2, 'Montevideo', 0)],
    message: 'Aún no hay proyectos publicados en Uruguay para 2026.',
  },
  {
    departments: [department(1, 'Canelones', 2), department(2, 'Montevideo', 0)],
    message:
      'Nuestros proyectos llegan a 1 departamento, priorizando comunidades con mayor vulnerabilidad social.',
  },
  {
    departments: [department(1, 'Canelones', 2), department(2, 'Montevideo', 1)],
    message:
      'Nuestros proyectos llegan a 2 departamentos, priorizando comunidades con mayor vulnerabilidad social.',
  },
])('describes department coverage as "$message"', ({ departments, message }) => {
  render(<DepartmentExplorer year={2026} departments={departments} />);

  expect(screen.getByText(message)).toBeDefined();
});
