import { z } from 'zod';
import { MAX_INT32 } from './ids';

const COUNTERPARTY_TYPES = ['publicSector', 'privateSector', 'internationalCooperation'] as const;

export const projectSchema = z
  .object({
    name: z.string().trim().max(100, 'Máx. 100 caracteres').min(1, 'El nombre es obligatorio'),
    status: z.enum(['active', 'inactive']),
    intensity: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.enum(['high', 'medium', 'low']).nullable()
    ),
    startYear: z.coerce
      .number()
      .int()
      .min(1989, 'Año inválido')
      .refine((year) => year <= new Date().getFullYear(), 'Año inválido'),
    endYear: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.coerce
        .number()
        .int()
        .min(1989, 'Año inválido')
        .refine((year) => year <= new Date().getFullYear(), 'Año inválido')
        .nullable()
    ),
    leadCoordinatorId: z.coerce
      .number({ error: 'Elegí un coordinador' })
      .int()
      .positive('Elegí un coordinador')
      .max(MAX_INT32),
    generalObjective: z
      .string()
      .trim()
      .max(500, 'Máx. 500 caracteres')
      .optional()
      .transform((value) => value || null),
    publicDescription: z
      .string()
      .trim()
      .max(1000, 'Máx. 1000 caracteres')
      .optional()
      .transform((value) => value || null),
    internalNotes: z
      .string()
      .trim()
      .max(1000, 'Máx. 1000 caracteres')
      .optional()
      .transform((value) => value || null),
    showOnLanding: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    counterpartyTypes: z
      .array(z.enum(COUNTERPARTY_TYPES, { error: 'Seleccioná una contraparte válida' }), {
        error: 'Seleccioná al menos una contraparte',
      })
      .min(1, 'Seleccioná al menos una contraparte')
      .transform((types) => COUNTERPARTY_TYPES.filter((type) => types.includes(type))),
  })
  .superRefine((data, ctx) => {
    if (data.status !== 'inactive') {
      if (data.endYear !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['endYear'],
          message: 'Solo los proyectos inactivos tienen año de fin',
        });
      }
      return;
    }
    if (data.endYear === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['endYear'],
        message: 'El año de fin es obligatorio para proyectos inactivos',
      });
    } else if (data.endYear < data.startYear) {
      ctx.addIssue({
        code: 'custom',
        path: ['endYear'],
        message: 'El año de fin no puede ser anterior al año de inicio',
      });
    }
  });

export const INTENSITY_REQUIRED_MESSAGE = 'Elegí una intensidad';

export type ProjectFormState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  formError?: string;
};
