'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { flattenError } from 'zod';
import { auth, signIn, signOut } from '@/auth';
import {
  getSessionExpirationTimestamp,
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';
import { loginSchema, type LoginFormState } from '@/lib/validation/auth';
import { LoginCooldownError } from '@/lib/auth/login-cooldown-error';

export async function login(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const rawDocumentId = String(formData.get('documentId') ?? '');
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors, documentId: rawDocumentId };
  }

  const { documentId, password } = parsed.data;
  const remember = Boolean(formData.get('rememberCheck'));

  try {
    await signIn('credentials', {
      documentId,
      password,
      remember: remember ? 'true' : 'false',
      redirect: false,
    });
  } catch (error) {
    if (error instanceof LoginCooldownError) {
      return {
        formError: 'Login cooldown',
        documentId,
        nextAllowedAt: error.nextAllowedAt.toISOString(),
      };
    }
    if (error instanceof AuthError) {
      return { formError: 'Invalid credentials', documentId: rawDocumentId };
    }
    throw error;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_EXPIRATION_COOKIE,
    String(getSessionExpirationTimestamp(remember)),
    SESSION_EXPIRATION_COOKIE_OPTIONS
  );

  const session = await auth();

  if (session?.user?.mustChangePassword) {
    redirect('/password-reset');
  }

  redirect('/dashboard');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_EXPIRATION_COOKIE);
  await signOut({ redirectTo: '/' });
}
