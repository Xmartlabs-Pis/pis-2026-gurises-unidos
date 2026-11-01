import { fireEvent, render, screen } from '@testing-library/react';
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

it.each([
  ['name', 'Nombre', 'Original', 'Nuevo', 'Original', 'Nuevo'],
  ['status', 'Estado', 'active', 'inactive', 'Activo', 'Inactivo'],
  ['intensity', 'Intensidad', 'medium', null, 'Media', 'Sin datos'],
  ['startYear', 'Año de inicio', 2019, 2020, '2019', '2020'],
  ['endYear', 'Año de fin', null, 2024, 'Sin datos', '2024'],
  ['showOnLanding', 'Visibilidad en la página pública', true, false, 'Sí', 'No'],
  [
    'counterpartyType',
    'Contraparte',
    'publicSector',
    'privateSector',
    'Sector Público',
    'Sector Privado',
  ],
  [
    'geographicScope',
    'Alcance geográfico',
    'national',
    'international',
    'Nacional',
    'Internacional',
  ],
  ['zone', 'Zona', 'city', 'rural', 'Montevideo', 'Rural'],
  ['countries', 'Países', [], ['Argentina', 'Brasil'], 'Sin datos', 'Argentina, Brasil'],
  ['cities', 'Ciudades', ['City'], [], 'City', 'Sin datos'],
  ['neighborhoods', 'Barrios', ['Old'], ['New'], 'Old', 'New'],
  [
    'leadCoordinatorId',
    'Coordinador responsable',
    { id: 1, name: 'Ana Pérez' },
    { id: 2, name: 'Luis García' },
    'Ana Pérez',
    'Luis García',
  ],
  [
    'topics',
    'Temáticas',
    [{ id: 1, name: 'Salud' }],
    [{ id: 2, name: 'Educación' }],
    'Salud',
    'Educación',
  ],
  [
    'strategicLines',
    'Líneas estratégicas',
    [{ id: 1, name: 'Protección' }],
    [{ id: 2, name: 'Participación' }],
    'Protección',
    'Participación',
  ],
  ['departments', 'Departamentos', [{ id: 1, name: 'Montevideo' }], [], 'Montevideo', 'Sin datos'],
] satisfies [string, string, Prisma.JsonValue, Prisma.JsonValue, string, string][])(
  'displays both values of the project field %s',
  (field, label, from, to, fromText, toText) => {
    render(
      <ProjectHistory
        fieldLabels={FIELD_LABELS}
        entries={[entry(1, 'update', 'project', { changes: [{ field, from, to }] })]}
      />
    );
    expect(screen.getByText('Test User actualizó el proyecto')).toBeDefined();
    expect(screen.getByText(`${label}: ${fromText} → ${toText}`)).toBeDefined();
  }
);

it.each([
  null,
  { changedFields: ['name'] },
  { changes: [] },
  { changes: [{ field: 'name', from: {}, to: 'New' }] },
  { changes: 'invalid' },
])('keeps the project event visible when detailed values are unavailable', (details) => {
  render(
    <ProjectHistory fieldLabels={FIELD_LABELS} entries={[entry(1, 'update', 'project', details)]} />
  );
  expect(screen.getByText('Test User actualizó el proyecto')).toBeDefined();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

it.each([
  ['generalObjective', 'Objetivo general: modificado'],
  ['publicDescription', 'Descripción pública: modificada'],
  ['internalNotes', 'Notas internas: modificadas'],
])('keeps the previous and new values of %s collapsed', (field, label) => {
  render(
    <ProjectHistory
      fieldLabels={FIELD_LABELS}
      entries={[
        entry(1, 'update', 'project', {
          changes: [{ field, from: 'Previous text', to: 'Updated text' }],
        }),
      ]}
    />
  );

  const summary = screen.getByText(label);
  const details = summary.closest('details');

  expect(details?.open).toBe(false);
  expect(screen.getByText('Previous text')).toBeDefined();
  expect(screen.getByText('Updated text')).toBeDefined();

  fireEvent.click(summary);

  expect(details?.open).toBe(true);
});

it.each([
  [
    'added',
    [],
    [{ name: 'Montevideo, Montevideo, Centro' }],
    'Sin datos',
    'Montevideo, Montevideo, Centro',
  ],
  [
    'removed',
    [{ name: 'Montevideo, Montevideo, Centro' }],
    [],
    'Montevideo, Montevideo, Centro',
    'Sin datos',
  ],
  [
    'replaced',
    [{ name: 'Montevideo, Montevideo, Centro' }],
    [{ name: 'Canelones, Las Piedras, Centro' }],
    'Montevideo, Montevideo, Centro',
    'Canelones, Las Piedras, Centro',
  ],
  [
    'mixed named formats',
    [{ id: 1, name: 'Montevideo, Montevideo, Centro' }],
    [{ name: 'Canelones, Las Piedras, Centro' }],
    'Montevideo, Montevideo, Centro',
    'Canelones, Las Piedras, Centro',
  ],
] satisfies [string, Prisma.JsonValue, Prisma.JsonValue, string, string][])(
  'shows %s localities alongside the other project changes',
  (_scenario, from, to, fromText, toText) => {
    render(
      <ProjectHistory
        fieldLabels={FIELD_LABELS}
        entries={[
          entry(1, 'update', 'project', {
            changes: [
              { field: 'name', from: 'Original project', to: 'Updated project' },
              { field: 'localities', from, to },
            ],
          }),
        ]}
      />
    );

    expect(screen.getByText('Test User actualizó el proyecto')).toBeDefined();
    expect(screen.getByText('Nombre: Original project → Updated project')).toBeDefined();
    expect(screen.getByText(`Ubicaciones: ${fromText} → ${toText}`)).toBeDefined();
  }
);

it.each([
  null,
  { field: 'localities', from: [], to: [{ city: 'Montevideo' }] },
  { field: 'localities', from: [], to: [{ name: 123 }] },
  { field: 'localities', from: [], to: [{ id: 'invalid', name: 'Montevideo' }] },
] satisfies Prisma.JsonValue[])(
  'keeps valid project changes when another change is malformed: %j',
  (invalidChange) => {
    render(
      <ProjectHistory
        fieldLabels={FIELD_LABELS}
        entries={[
          entry(1, 'update', 'project', {
            changes: [
              { field: 'name', from: 'Original project', to: 'Updated project' },
              invalidChange,
            ],
          }),
        ]}
      />
    );

    expect(screen.getByText('Nombre: Original project → Updated project')).toBeDefined();
    expect(screen.queryByText(/^Ubicaciones:/)).toBeNull();
  }
);
