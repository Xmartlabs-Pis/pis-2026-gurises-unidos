import { z } from 'zod';
import { isValidUruguayanDocumentId } from '@/lib/validation/user';
import { normalizeDocumentId } from '@/lib/utils';

export type LoginFormState = {
  formError?: string;
  errors?: Record<string, string[]>;
  documentId?: string;
};

export const loginSchema = z.object({
  documentId: z
    .string()
    .trim()
    .min(1, 'El documento es obligatorio.')
    .refine(isValidUruguayanDocumentId, 'Ingresá una cédula uruguaya válida.')
    .transform(normalizeDocumentId),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});
