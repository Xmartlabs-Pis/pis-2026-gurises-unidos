'use client';

import type { ReactNode } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SelectOption = {
  value: string;
  label: string;
};

export function SelectField({
  id,
  name,
  label,
  labelAddon,
  placeholder,
  clearLabel,
  options,
  onValueChange,
  description,
  messages,
  required,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  labelAddon?: ReactNode;
  placeholder?: string;
  clearLabel?: string;
  options: readonly SelectOption[];
  onValueChange?: (value: string) => void;
  description?: string;
  messages?: string[];
  required?: boolean;
  disabled?: boolean;
}) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const errorMessage = messages?.[0] ?? fieldState.error?.message;
  const value = typeof field.value === 'string' && field.value ? field.value : null;
  const fieldLabel = (
    <FieldLabel htmlFor={id} className="text-foreground text-xs leading-4 font-medium">
      {label}
    </FieldLabel>
  );

  return (
    <Field className="min-w-0 gap-1.5" data-invalid={Boolean(errorMessage)}>
      {labelAddon ? (
        <div className="flex items-center gap-1.5">
          {fieldLabel}
          {labelAddon}
        </div>
      ) : (
        fieldLabel
      )}
      <Select
        items={options}
        name={name}
        value={value}
        onValueChange={(nextValue) => {
          const selected = nextValue ?? '';
          onValueChange?.(selected);
          field.onChange(selected);
        }}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(errorMessage)}
          className="border-input bg-background w-full min-w-0 rounded-lg px-3 text-sm data-[size=default]:h-9"
        >
          <SelectValue placeholder={placeholder} className="min-w-0 truncate" />
        </SelectTrigger>
        <SelectContent align="start">
          {clearLabel && <SelectItem value={null}>{clearLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
