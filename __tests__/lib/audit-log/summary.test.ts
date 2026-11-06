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

  test('lists the published years before and after the change', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'publicSettings',
          details: { changes: [{ field: 'publishedYears', from: [2025], to: [2026, 2025] }] },
        },
        {}
      )
    ).toBe('Años publicados: 2025 → 2026, 2025');
  });

  test('lists every grouped metric card and topic change by name', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'metric',
          details: {
            changes: [
              { field: 'Familias acompañadas', from: false, to: true },
              { field: 'Proyectos con actividad', from: true, to: false },
            ],
          },
        },
        {}
      )
    ).toBe('Familias acompañadas: No → Sí, Proyectos con actividad: Sí → No');
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'topic',
          details: { changes: [{ field: 'Educación', from: false, to: true }] },
        },
        {}
      )
    ).toBe('Educación: No → Sí');
  });

  test('describes a renamed topic', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'topic',
          details: { previousName: 'Salud', name: 'Bienestar' },
        },
        {}
      )
    ).toBe('Nombre: Salud → Bienestar');
  });

  test('shows the partners as an ordered set before and after the new order', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'partner',
          details: { order: { from: ['A', 'B', 'C'], to: ['B', 'C', 'A'] } },
        },
        {}
      )
    ).toBe('A, B, C → B, C, A');
  });

  test('keeps describing project changes when the details carry a name', () => {
    expect(
      describeAuditDetails(
        {
          action: 'update',
          entity: 'project',
          details: { changes: [{ field: 'endYear', from: 2026, to: 2027 }], name: 'Huerta' },
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

test('describes locality snapshots without ids alongside other project changes', () => {
  expect(
    describeAuditDetails(
      {
        action: 'update',
        entity: 'project',
        details: {
          changes: [
            { field: 'name', from: 'Original project', to: 'Updated project' },
            {
              field: 'localities',
              from: [{ name: 'Montevideo, Montevideo, Centro' }],
              to: [{ name: 'Canelones, Las Piedras, Centro' }],
            },
          ],
        },
      },
      {}
    )
  ).toBe(
    'Nombre: Original project → Updated project, ' +
      'Ubicaciones: Montevideo, Montevideo, Centro → Canelones, Las Piedras, Centro'
  );
});

test('summarizes a cover photo and crop as one sentence', () => {
  expect(
    describeAuditDetails(
      {
        action: 'update',
        entity: 'project',
        details: {
          changes: [
            {
              field: 'coverPhoto',
              from: '/uploads/covers/11111111-1111-4111-8111-111111111111.webp',
              to: '/uploads/covers/22222222-2222-4222-8222-222222222222.webp',
            },
            {
              field: 'coverCrop',
              from: null,
              to: { x: 0, y: 25, width: 100, height: 50 },
            },
          ],
        },
      },
      {}
    )
  ).toBe('actualizó la imagen de portada');
});

test('mentions the cover once when other fields change too', () => {
  expect(
    describeAuditDetails(
      {
        action: 'update',
        entity: 'project',
        details: {
          changes: [
            { field: 'name', from: 'Original project', to: 'Updated project' },
            { field: 'coverPhoto', from: '/old.webp', to: '/new.webp' },
            { field: 'coverCrop', from: null, to: { x: 0, y: 0, width: 100, height: 100 } },
          ],
        },
      },
      {}
    )
  ).toBe('Nombre: Original project → Updated project, Imagen de portada actualizada');
});
