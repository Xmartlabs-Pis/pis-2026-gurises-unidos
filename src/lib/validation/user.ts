import { z } from 'zod';
import { normalizeDocumentId } from '@/lib/utils';

export const PRESERVED_FIELDS = ['firstName', 'lastName', 'documentId', 'email', 'role'] as const;

export type PreservedField = (typeof PRESERVED_FIELDS)[number];

export type UserFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
  values?: Partial<Record<PreservedField, string>>;
  restored?: boolean;
  restoreConfirmationRequired?: boolean;
};

export function isValidUruguayanDocumentId(rawValue: string) {
  if (!/^[\d .-]+$/.test(rawValue)) return false;

  const digits = rawValue.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 8) return false;

  const paddedDigits = digits.padStart(8, '0');
  const weights = [2, 9, 8, 7, 6, 3, 4];
  const sum = weights.reduce(
    (total, weight, index) => total + Number(paddedDigits[index]) * weight,
    0
  );
  const checkDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);

  return checkDigit === Number(paddedDigits[7]);
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El correo es obligatorio.')
  .max(254, 'El correo no puede superar los 254 caracteres.')
  .pipe(z.email({ error: 'Ingresá un correo electrónico válido.' }));

export const userEditFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(100, 'El nombre no puede superar los 100 caracteres.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio.')
    .max(100, 'El apellido no puede superar los 100 caracteres.'),
  documentId: z
    .string()
    .trim()
    .min(1, 'El documento es obligatorio.')
    .refine(isValidUruguayanDocumentId, 'Ingresá una cédula uruguaya válida.')
    .transform(normalizeDocumentId),
  email: emailSchema,
  role: z.enum(['admin', 'coordinator']),
});
