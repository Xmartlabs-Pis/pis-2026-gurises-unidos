import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { parseId } from '@/lib/validation/ids';

export async function requireUser() {
  const session = await auth();
  const id = parseId(session?.user?.id);
  if (!id) redirect('/login');
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, deletedAt: true },
  });
  if (!user || user.status !== 'active' || user.deletedAt) redirect('/login');
  return user;
}
