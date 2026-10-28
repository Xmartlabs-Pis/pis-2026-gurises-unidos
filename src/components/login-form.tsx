'use client';

import { startTransition, useActionState, useEffect, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { login } from '@/app/actions/auth';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { loginSchema, type LoginFormState } from '@/lib/validation/auth';
import { normalizeDocumentId } from '@/lib/utils';
import InputVisibilityToggle from './ui/forms/input-visibility-toggle';

type LoginFormValues = {
  documentId: string;
  password: string;
};

export function LoginForm({ sessionExpired = false }: { sessionExpired?: boolean }) {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);
  const [state, formAction, pending] = useActionState(submitLogin, {});
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormValues>,
    defaultValues: { documentId: '', password: '' },
  });
  const { handleSubmit, setError, clearErrors, getFieldState } = form;
  const documentId = useWatch({ control: form.control, name: 'documentId' });
  const nextAllowedAt = cooldowns[normalizeDocumentId(documentId.trim())];
  const remainingSeconds = nextAllowedAt ? Math.max(0, Math.ceil((nextAllowedAt - now) / 1000)) : 0;
  const isBlocked = remainingSeconds > 0;
  const hasActiveCooldown = Object.values(cooldowns).some((blockedUntil) => blockedUntil > now);

  async function submitLogin(previousState: LoginFormState, formData: FormData) {
    const nextState = await login(previousState, formData);
    if (nextState.retryAfterSeconds !== undefined && nextState.documentId) {
      const blockedDocumentId = normalizeDocumentId(nextState.documentId.trim());
      const blockedUntil = performance.now() + nextState.retryAfterSeconds * 1000;
      setCooldowns((current) => ({ ...current, [blockedDocumentId]: blockedUntil }));
    }
    setNow(performance.now());
    return nextState;
  }

  useEffect(() => {
    if (!hasActiveCooldown) return;
    const interval = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(interval);
  }, [hasActiveCooldown]);

  useEffect(() => {
    if (!state.formError || state.nextAllowedAt) return;
    setError('password', { type: 'server', message: 'Credenciales incorrectas' });
  }, [state, setError]);

  function clearServerPasswordError() {
    if (getFieldState('password').error?.type === 'server') {
      clearErrors('password');
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBlocked || pending) return;
    const formElement = event.currentTarget;
    const submitter = event.nativeEvent.submitter;
    return handleSubmit(() => {
      startTransition(() => {
        formAction(submitter ? new FormData(formElement, submitter) : new FormData(formElement));
      });
    })(event);
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {sessionExpired && !state.formError && (
          <p
            role="status"
            className="border-border bg-muted text-foreground rounded-lg border px-4 py-3 text-sm"
          >
            Tu sesión se cerró por inactividad. Iniciá sesión nuevamente para continuar.
          </p>
        )}
        <div className="flex flex-col gap-4.5">
          <TextInputField
            id="documentId"
            name="documentId"
            label="Cédula"
            type="text"
            autoComplete="username"
            placeholder="Ej. 4.123.456-7"
            onChange={clearServerPasswordError}
          />
          <TextInputField
            id="password"
            name="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="Tu contraseña"
            onChange={clearServerPasswordError}
            trailingAction={
              <InputVisibilityToggle
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
            }
          />
        </div>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:gap-0">
          <FieldGroup className="gap-3">
            <Field orientation="horizontal" className="cursor-pointer">
              <Checkbox
                id="rememberCheck"
                name="rememberCheck"
                className="bg-background h-4 w-4 rounded-sm shadow-xs/10"
              />
              <FieldLabel
                htmlFor="rememberCheck"
                className="text-primary text-sm leading-5 font-medium tracking-normal"
              >
                Recordarme
              </FieldLabel>
            </Field>
          </FieldGroup>
          <Link
            href="/forgot-password"
            className="text-primary shrink-0 font-sans text-sm leading-5 font-medium tracking-normal hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {isBlocked && (
          <p role="status" className="text-destructive text-sm">
            Demasiados intentos. Podés volver a intentar con esta cédula en{' '}
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}.
          </p>
        )}
        <Button type="submit" disabled={pending || isBlocked} className="h-9 w-full shadow-xs/10">
          Ingresar
        </Button>
      </form>
    </FormProvider>
  );
}
