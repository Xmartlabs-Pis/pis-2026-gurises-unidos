'use client';

import type { ComponentProps } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';

type TextareaFieldProps = Omit<ComponentProps<typeof Textarea>, 'onChange' | 'value'> & {
  id: string;
  name: string;
  label: string;
  messages?: string[];
  description?: string;
};

export function TextareaField({
  id,
  name,
  label,
  messages,
  description,
  ...props
}: TextareaFieldProps) {
  const { register, control } = useFormContext();
  const { errors } = useFormState({ control, name });
  const fieldError = errors[name];
  const schemaMessage =
    fieldError && 'message' in fieldError && typeof fieldError.message === 'string'
      ? fieldError.message
      : undefined;
  const errorMessage = messages?.[0] ?? schemaMessage;

  return (
    <Field data-invalid={Boolean(errorMessage)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        {...props}
        {...register(name)}
        id={id}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={
          errorMessage ? `${id}-error` : description ? `${id}-description` : undefined
        }
        className="border-input bg-background min-h-20 resize-y rounded-lg px-3 py-2 text-base md:text-sm"
      />
      {errorMessage ? (
        <FieldError id={`${id}-error`}>{errorMessage}</FieldError>
      ) : description ? (
        <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
