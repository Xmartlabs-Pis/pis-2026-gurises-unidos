import { describe, expect, test } from 'vitest';
import { describeAuditDetails } from '@/lib/audit-log/summary';

const CATEGORY_LABELS = { families: 'Familias', earlyChildhood: 'Primera infancia' };

describe('describeAuditDetails', () => {
  test.each([
    ['invalidCredentials', 'Autenticación fallida'],
    ['blocked', 'Bloqueo temporal'],
  ])('describes the failed login reason %s', (reason, expected) => {
    expect(
      describeAuditDetails(
        {
          action: 'loginFailure',
          entity: 'authentication',
          details: { documentId: '65432105', reason },
        },
        {}
      )
    ).toBe(expected);
  });
  test('describes a user status change with readable values', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'user',
          details: { changes: [{ field: 'status', from: 'pendingInvitation', to: 'active' }] },
        },
        {}
      )
    ).toBe('Estado: Invitación pendiente → Activo');
  });

  test('describes a user role change with readable values', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'user',
          details: {
            changedFields: ['firstName', 'role'],
            changes: [{ field: 'role', from: 'coordinator', to: 'admin' }],
          },
        },
        {}
      )
    ).toBe('Rol: Coordinador → Administrador');
  });

  test('describes a restored user', () => {
    expect(
      describeAuditDetails({ action: 'creation', entity: 'user', details: { restored: true } }, {})
    ).toBe('Usuario restaurado');
  });

  test('totals the beneficiaries loaded for a new year', () => {
    expect(
      describeAuditDetails(
        {
          action: 'creation',
          entity: 'beneficiary',
          details: { year: 2026, values: { families: 12, earlyChildhood: 30 } },
        },
        CATEGORY_LABELS
      )
    ).toBe('Año 2026 · 42 beneficiarios');
  });

  test('totals a new year logged as changes from zero', () => {
    expect(
      describeAuditDetails(
        {
          action: 'creation',
          entity: 'beneficiary',
          details: { year: 2025, changes: [{ field: 'families', from: 0, to: 1 }] },
        },
        CATEGORY_LABELS
      )
    ).toBe('Año 2025 · 1 beneficiario');
  });

  test('lists every beneficiary change with the category name', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'beneficiary',
          details: {
            year: 2026,
            changes: [
              { field: 'earlyChildhood', from: 42, to: 48 },
              { field: 'families', from: 30, to: 34 },
            ],
          },
        },
        CATEGORY_LABELS
      )
    ).toBe('Año 2026 · Primera infancia: 42 → 48, Familias: 30 → 34');
  });

  test('lists the changed project fields when only their names were logged', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'project',
          details: { changedFields: ['name', 'topics', 'unknownField'] },
        },
        {}
      )
    ).toBe('Cambió: Nombre, Temáticas, unknownField');
  });

  test('prefers the project values when they were logged', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'project',
          details: { changes: [{ field: 'endYear', from: 2026, to: 2027 }] },
        },
        {}
      )
    ).toBe('Año de fin: 2026 → 2027');
  });

  test.each([
    ['no details', null],
    ['unexpected details', 'oops'],
    ['an empty object', {}],
  ])('returns nothing for %s', (_, details) => {
    expect(describeAuditDetails({ action: 'deletion', entity: 'project', details }, {})).toBeNull();
  });
});

test('formats project relations and enum values with readable labels', () => {
  expect(
    describeAuditDetails(
      {
        action: 'update',
        entity: 'project',
        details: {
          changes: [
            {
              field: 'leadCoordinatorId',
              from: { id: 1, name: 'Ana Pérez' },
              to: { id: 2, name: 'Luis García' },
            },
            {
              field: 'topics',
              from: [{ id: 1, name: 'Salud' }],
              to: [{ id: 2, name: 'Educación' }],
            },
            { field: 'status', from: 'active', to: 'inactive' },
            { field: 'zone', from: 'city', to: 'rural' },
          ],
        },
      },
      {}
    )
  ).toBe(
    'Coordinador responsable: Ana Pérez → Luis García, Temáticas: Salud → Educación, ' +
      'Estado: Activo → Inactivo, Zona: Montevideo → Rural'
  );
});

test.each([
  ['generalObjective', 'Objetivo general: modificado'],
  ['publicDescription', 'Descripción pública: modificada'],
  ['internalNotes', 'Notas internas: modificadas'],
])('summarizes the project text field %s', (field, expected) => {
  expect(
    describeAuditDetails(
      {
        action: 'update',
        entity: 'project',
        details: {
          changes: [{ field, from: 'Previous text', to: 'Updated text' }],
        },
      },
      {}
    )
  ).toBe(expected);
});
