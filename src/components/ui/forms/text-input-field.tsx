'use client';

import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { cn } from 'cn';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type TextInputFieldProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'className'
> & {
  id: string;
  name: string;
  label: string;
  description?: string;
  messages?: string[];
  trailingAction?: ReactNode;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function TextInputField({
  id,
  name,
  label,
  description,
  messages,
  trailingAction,
  className,
  onChange,
  ...inputProps
}: TextInputFieldProps) {
  const { register, control } = useFormContext();
  const { errors } = useFormState({ control, name });
  const registration = register(name);
  const fieldError = errors[name];
  const schemaMessage =
    fieldError && 'message' in fieldError && typeof fieldError.message === 'string'
      ? fieldError.message
      : undefined;
  const errorMessage = schemaMessage ?? messages?.[0];

  return (
    <Field className={cn('min-w-0 gap-1.5', className)} data-invalid={Boolean(errorMessage)}>
      <FieldLabel htmlFor={id} className="text-foreground text-xs leading-4 font-medium">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          {...inputProps}
          {...registration}
          id={id}
          onChange={(event) => {
            onChange?.(event);
            void registration.onChange(event);
          }}
          aria-invalid={Boolean(errorMessage)}
          className={cn(
            'border-input bg-background h-9 min-w-0 rounded-lg px-3 text-base md:text-sm',
            trailingAction && 'pr-8'
          )}
        />
        {trailingAction && (
          <div className="absolute top-1/2 right-1 -translate-y-1/2">{trailingAction}</div>
        )}
      </div>
      {errorMessage ? (
        <FieldError className="text-xs leading-4">{errorMessage}</FieldError>
      ) : description ? (
        <FieldDescription className="text-muted-foreground text-xs leading-4">
          {description}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
