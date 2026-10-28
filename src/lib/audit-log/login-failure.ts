import { z } from 'zod';

export const loginFailureDetailsSchema = z.object({
  documentId: z.string().regex(/^\d{7,8}$/),
  reason: z.enum(['invalidCredentials', 'blocked']),
});

export type LoginFailureReason = z.infer<typeof loginFailureDetailsSchema>['reason'];

export const LOGIN_FAILURE_REASON_LABELS: Record<LoginFailureReason, string> = {
  invalidCredentials: 'Autenticación fallida',
  blocked: 'Bloqueo temporal',
};
