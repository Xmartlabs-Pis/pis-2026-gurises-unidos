import { z } from 'zod';
import { normalizeDocumentId } from '@/lib/utils';
import { emailSchema } from '@/lib/validation/email';
import { passwordSchema } from '@/lib/validation/password';

export const PRESERVED_FIELDS = ['firstName', 'lastName', 'documentId', 'email', 'role'] as const;

export const CREATION_METHODS = ['invitation', 'password'] as const;

export type PreservedField = (typeof PRESERVED_FIELDS)[number];

export type UserFormState = {
  success?: boolean;
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

export const userFormSchema = userEditFormSchema
  .extend({
    creationMethod: z.enum(CREATION_METHODS).default('invitation'),
    password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.creationMethod !== 'password') return;
    const result = passwordSchema.safeParse(data.password ?? '');
    if (result.success) return;
    ctx.addIssue({ code: 'custom', path: ['password'], message: result.error.issues[0].message });
  });
