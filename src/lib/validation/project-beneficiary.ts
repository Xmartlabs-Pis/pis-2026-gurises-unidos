import { z } from 'zod';
import { MAX_INT32 } from './ids';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const beneficiaryCount = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: 'Valor inválido' })
    .int('Valor inválido')
    .min(0, 'No puede ser negativo')
    .max(MAX_INT32, 'La cantidad es demasiado grande')
    .default(0)
);

export const beneficiaryYear = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: 'Año inválido' })
    .int('Año inválido')
    .min(1989, 'Año inválido')
    .refine((year) => year <= new Date().getFullYear(), 'Año inválido')
    .default(() => new Date().getFullYear())
);

export function buildBeneficiaryCountsShape(keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, beneficiaryCount]));
}
