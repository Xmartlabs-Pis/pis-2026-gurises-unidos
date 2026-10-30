import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { InstitutionalContribution } from '@/components/projects/detail/institutional-contribution';

function renderContribution(projectCount: number) {
  render(
    <InstitutionalContribution
      data={{
        nationalReach: { projectValue: 342, nationalValue: 4286, percentage: 8 },
        activeProjects: { projectCount, totalCount: 27 },
        territories: {
          count: 1,
          items: ['Montevideo'],
        },
      }}
    />
  );
}

test('describes an active project as active', () => {
  renderContribution(1);

  expect(screen.getByText('1/27')).toBeDefined();
  expect(screen.getByText('Este proyecto está activo')).toBeDefined();
});

test('does not describe an inactive project as active', () => {
  renderContribution(0);

  expect(screen.getByText('0/27')).toBeDefined();
  expect(screen.getByText('Este proyecto no está activo')).toBeDefined();
  expect(screen.queryByText('Este proyecto está activo')).toBeNull();
});
