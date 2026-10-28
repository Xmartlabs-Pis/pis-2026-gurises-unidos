import { AuditAction, AuditEntity, Prisma } from '@/generated/prisma/client';
import type { LoginFailureReason } from '@/lib/audit-log/login-failure';

type AuditLogEntry = {
  authorId: number;
  action: Exclude<AuditAction, 'loginFailure'>;
  entity: Exclude<AuditEntity, 'authentication'>;
  entityId: number;
  details?: Prisma.InputJsonValue;
};

export function logAudit(tx: Prisma.TransactionClient, entry: AuditLogEntry) {
  return tx.auditLog.create({ data: entry });
}

export function logFailedLoginAttempt(
  tx: Prisma.TransactionClient,
  documentId: string,
  reason: LoginFailureReason
) {
  return tx.auditLog.create({
    data: {
      action: 'loginFailure',
      entity: 'authentication',
      details: { documentId, reason },
    },
  });
}
