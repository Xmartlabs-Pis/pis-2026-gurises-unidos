import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProjectHistory } from '@/components/projects/form/project-history';
import type { AuditAction, AuditEntity } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

const FIELD_LABELS = Object.fromEntries(
  BENEFICIARY_CATEGORY_OPTIONS.map(({ key, name }) => [key, name])
);

function entry(
  id: number,
  action: AuditAction,
  entity: AuditEntity = 'project',
  details: Prisma.JsonValue | null = null
) {
  return {
    id,
    action,
    entity,
    details,
    occurredAt: new Date('2026-09-18T12:00:00Z'),
    author: { firstName: 'Test', lastName: 'User' },
  };
}

it('displays project events without showing password audit events', () => {
  render(
    <ProjectHistory
      fieldLabels={FIELD_LABELS}
      entries={[
        entry(1, 'creation'),
        entry(2, 'update'),
        entry(3, 'deletion'),
        entry(4, 'passwordChange'),
        entry(5, 'passwordReset'),
      ]}
    />
  );
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByText('Test User creó el proyecto')).toBeDefined();
  expect(screen.getByText('Test User actualizó el proyecto')).toBeDefined();
  expect(screen.getByText('Test User eliminó el proyecto')).toBeDefined();
});

it('shows the empty state when there are no project audit events', () => {
  render(<ProjectHistory fieldLabels={FIELD_LABELS} entries={[entry(1, 'passwordChange')]} />);
  expect(screen.getByText('Todavía no hay modificaciones registradas.')).toBeDefined();
  expect(screen.queryByRole('list')).toBeNull();
});

it.each(['creation', 'update'] as const)(
  'shows the previous and new values of beneficiary %s events',
  (action) => {
    render(
      <ProjectHistory
        fieldLabels={FIELD_LABELS}
        entries={[
          entry(1, action, 'beneficiary', {
            year: 2026,
            changes: [
              { field: 'families', from: 10, to: 15 },
              { field: 'directChildrenAdolescents', from: 5, to: 0 },
            ],
          }),
        ]}
      />
    );
    expect(
      screen.getByText('Test User actualizó el número de beneficiarios de 2026')
    ).toBeDefined();
    expect(screen.getByText('Familias: 10 → 15')).toBeDefined();
    expect(screen.getByText('NNA directos: 5 → 0')).toBeDefined();
  }
);

it.each([
  ['without details', null],
  ['with the legacy format', { year: 2026, changedFields: ['families'] }],
  ['without changes', { year: 2026, changes: [] }],
])('hides beneficiary events %s', (_name, details) => {
  render(
    <ProjectHistory
      fieldLabels={FIELD_LABELS}
      entries={[entry(1, 'creation', 'beneficiary', details)]}
    />
  );
  expect(screen.getByText('Todavía no hay modificaciones registradas.')).toBeDefined();
});
