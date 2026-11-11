import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { logAudit } from '@/lib/audit-log';
import { requireUser } from '@/lib/auth/require-user';
import { parseId } from '@/lib/validation/ids';

export type CatalogActionState<Values = { name: string }> = {
  errors?: Record<string, string[]>;
  formError?: string;
  values?: Values;
  success?: boolean;
};

const FORBIDDEN_MESSAGE = 'No tenés permisos para realizar esta acción.';

export async function readCatalogAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { user: null, state: { formError: FORBIDDEN_MESSAGE } as const };
  }
  return { user, state: null };
}

export function parseCatalogFields<Output, Values>(
  schema: z.ZodType<Output>,
  values: Values
): { ok: true; data: Output } | { ok: false; state: CatalogActionState<Values> } {
  const parsed = schema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
    if (Array.isArray(messages) && messages.length) errors[field] = messages.map(String);
  }
  return { ok: false, state: { errors, values } };
}

export function guardCatalogId(id: number, message: string) {
  if (parseId(id)) return null;
  return { formError: message };
}

export function catalogWriteError<Values>(
  error: unknown,
  duplicate: { message: string; values?: Values },
  unexpected: { message: string; values?: Values }
): CatalogActionState<Values> {
  const failure =
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      ? duplicate
      : unexpected;
  return failure.values === undefined
    ? { formError: failure.message }
    : { formError: failure.message, values: failure.values };
}

export async function reactivateOrCreate(
  tx: Prisma.TransactionClient,
  record: {
    authorId: number;
    entity: 'topic' | 'strategicLine';
    findExisting: () => Promise<{ id: number; name: string; isActive: boolean } | null>;
    reactivate: (id: number) => Promise<{ count: number }>;
    create: () => Promise<{ id: number; name: string }>;
  }
) {
  const existing = await record.findExisting();
  if (existing?.isActive) return 'duplicate' as const;
  if (existing) {
    const { count } = await record.reactivate(existing.id);
    if (count === 0) return 'duplicate' as const;
  }
  const saved = existing ?? (await record.create());
  await logAudit(tx, {
    authorId: record.authorId,
    action: 'creation',
    entity: record.entity,
    entityId: saved.id,
    details: { name: saved.name },
  });
  return 'saved' as const;
}

export async function deleteIfUnused(
  tx: Prisma.TransactionClient,
  record: {
    authorId: number;
    entity: 'topic' | 'strategicLine';
    entityId: number;
    missing: string;
    associated: string;
    lock: () => Promise<unknown>;
    findCurrent: () => Promise<{ name: string } | null>;
    countProjects: () => Promise<number>;
    deactivate: () => Promise<unknown>;
  }
) {
  await record.lock();
  const current = await record.findCurrent();
  if (!current) return record.missing;
  if ((await record.countProjects()) > 0) return record.associated;
  await record.deactivate();
  await logAudit(tx, {
    authorId: record.authorId,
    action: 'deletion',
    entity: record.entity,
    entityId: record.entityId,
    details: { name: current.name },
  });
  return null;
}

export async function renameCatalogRecord(
  tx: Prisma.TransactionClient,
  record: {
    id: number;
    name: string;
    authorId: number;
    entity: 'topic' | 'strategicLine' | 'beneficiaryCategory';
    missing: string;
    duplicate: string;
    inactive: string;
    lock: () => Promise<unknown>;
    findCurrent: () => Promise<{ name: string } | null>;
    findDuplicate: () => Promise<{ isActive: boolean } | null>;
    update: () => Promise<unknown>;
  }
) {
  await record.lock();
  const current = await record.findCurrent();
  if (!current) return record.missing;
  const duplicate = await record.findDuplicate();
  if (duplicate) return duplicate.isActive ? record.duplicate : record.inactive;
  await record.update();
  await logAudit(tx, {
    authorId: record.authorId,
    action: 'update',
    entity: record.entity,
    entityId: record.id,
    details: { previousName: current.name, name: record.name },
  });
  return null;
}
