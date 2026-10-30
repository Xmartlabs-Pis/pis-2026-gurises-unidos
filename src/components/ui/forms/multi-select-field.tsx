'use client';

import { useState } from 'react';
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

export function MultiSelectField({
  id,
  name,
  label,
  placeholder,
  options,
  required,
  maxSelected,
  maxSelectedMessage,
  emptyMessage,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  options: readonly SelectOption[];
  required?: boolean;
  maxSelected?: number;
  maxSelectedMessage?: string;
  emptyMessage?: string;
}) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = Array.isArray(field.value)
    ? field.value.filter((value): value is string => typeof value === 'string')
    : [];
  const errorMessage = fieldState.error?.message;
  const isMaxSelected = maxSelected !== undefined && selectedValues.length >= maxSelected;
  const isEmpty = options.length === 0;

  return (
    <Field className="min-w-0 gap-1.5" data-invalid={Boolean(errorMessage)}>
      <FieldLabel htmlFor={id} className="text-foreground text-xs leading-4 font-medium">
        {label}
      </FieldLabel>
      <Select
        multiple
        open={isOpen}
        onOpenChange={setIsOpen}
        value={selectedValues}
        onValueChange={(value) => {
          field.onChange(value);
          if (maxSelected !== undefined && value.length === maxSelected) {
            setIsOpen(false);
          }
        }}
        required={required}
        disabled={isEmpty}
        items={options}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(errorMessage)}
          aria-required={required}
          className="border-input bg-background w-full min-w-0 rounded-lg px-3 text-sm data-[size=default]:h-9"
        >
          <SelectValue placeholder={placeholder} className="min-w-0 truncate">
            {(value: string[]) => {
              const selectedLabels = options
                .filter((option) => value.includes(option.value))
                .map((option) => option.label)
                .join(', ');
              return selectedLabels || placeholder;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={
                maxSelected !== undefined && isMaxSelected && !selectedValues.includes(option.value)
              }
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {errorMessage ? (
        <FieldError className="text-xs leading-4">{errorMessage}</FieldError>
      ) : isEmpty && emptyMessage ? (
        <FieldDescription className="text-muted-foreground text-xs leading-4">
          {emptyMessage}
        </FieldDescription>
      ) : isMaxSelected && maxSelectedMessage ? (
        <FieldDescription className="text-muted-foreground text-xs leading-4">
          {maxSelectedMessage}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
