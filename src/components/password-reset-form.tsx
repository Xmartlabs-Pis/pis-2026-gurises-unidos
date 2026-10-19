'use client';

import { startTransition, useActionState, useEffect, useState, type SubmitEvent } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { completeForcedPasswordChange } from '@/app/actions/password';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { Button } from '@/components/ui/button';
import {
  forcedPasswordChangeSchema,
  type ForcedPasswordChangeFormValues,
} from '@/lib/validation/password';
import InputVisibilityToggle from './ui/forms/input-visibility-toggle';

export function PasswordResetForm() {
  const [state, formAction, pending] = useActionState(completeForcedPasswordChange, {});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<ForcedPasswordChangeFormValues>({
    resolver: zodResolver(forcedPasswordChangeSchema) as Resolver<ForcedPasswordChangeFormValues>,
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  const { handleSubmit, setError, clearErrors, getFieldState } = form;

  useEffect(() => {
    if (state.errors?.newPassword?.[0]) {
      setError('newPassword', { type: 'server', message: state.errors.newPassword[0] });
    }
    if (state.errors?.confirmNewPassword?.[0]) {
      setError('confirmNewPassword', {
        type: 'server',
        message: state.errors.confirmNewPassword[0],
      });
    }
  }, [state, setError]);

  function clearServerError(field: keyof ForcedPasswordChangeFormValues) {
    if (getFieldState(field).error?.type === 'server') {
      clearErrors(field);
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
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
        {state.formError ? (
          <p role="alert" className="text-destructive text-sm leading-5">
            {state.formError}
          </p>
        ) : null}
        <div className="flex flex-col gap-4.5">
          <TextInputField
            id="newPassword"
            name="newPassword"
            label="Nueva contraseña"
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            onChange={() => clearServerError('newPassword')}
            trailingAction={
              <InputVisibilityToggle
                visible={showNewPassword}
                onToggle={() => setShowNewPassword((value) => !value)}
              />
            }
          />
          <TextInputField
            id="confirmNewPassword"
            name="confirmNewPassword"
            label="Confirmar nueva contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repetí la nueva contraseña"
            onChange={() => clearServerError('confirmNewPassword')}
            trailingAction={
              <InputVisibilityToggle
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
              />
            }
          />
        </div>
        <Button type="submit" disabled={pending} className="h-9 w-full shadow-xs/10">
          Actualizar contraseña
        </Button>
      </form>
    </FormProvider>
  );
}
