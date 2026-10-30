import { AuditAction, AuditEntity, Prisma } from '@/generated/prisma/client';

type AuditLogEntry = {
  authorId: number;
  action: AuditAction;
  entity: AuditEntity;
  entityId: number;
  details?: Prisma.InputJsonValue;
};

export function logAudit(tx: Prisma.TransactionClient, entry: AuditLogEntry) {
  return tx.auditLog.create({ data: entry });
}
