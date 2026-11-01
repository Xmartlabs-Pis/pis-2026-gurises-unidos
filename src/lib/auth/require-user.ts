import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { parseId } from '@/lib/validation/ids';

export async function getActiveUser() {
  const session = await auth();
  const id = parseId(session?.user?.id);
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, deletedAt: true },
  });
  if (!user || user.status !== 'active' || user.deletedAt) return null;
  return user;
}

export async function requireUser() {
  const user = await getActiveUser();
  if (!user) redirect('/login');
  return user;
}
