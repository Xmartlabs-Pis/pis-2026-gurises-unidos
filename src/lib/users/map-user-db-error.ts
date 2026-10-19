import { Prisma } from '@/generated/prisma/client';

export function mapUserDbError(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code === 'P2002') {
    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
    if (fields.some((field) => field.includes('documentId')))
      return 'Ya existe un usuario con ese documento.';
    if (fields.some((field) => field.includes('email')))
      return 'Ya existe un usuario con ese correo electrónico.';
  }
  if (error.code === 'P2034')
    return 'Otra operación modificó los usuarios al mismo tiempo. Intentá de nuevo.';
  return null;
}
