import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') forbidden();
  return session.user;
}
