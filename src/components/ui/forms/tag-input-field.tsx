'use client';

import { useState, type KeyboardEvent } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { PlusIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function isSameTag(a: string, b: string) {
  return a.toLocaleLowerCase('es') === b.toLocaleLowerCase('es');
}

export function TagInputField({
  id,
  name,
  label,
  placeholder,
  description,
  disabled,
  maxLength,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const [draft, setDraft] = useState('');
  const values = Array.isArray(field.value)
    ? field.value.filter((value): value is string => typeof value === 'string')
    : [];
  const errorMessage = fieldState.error?.message;

  function addDraft() {
    const value = draft.trim();
    setDraft('');
    if (!value || values.some((item) => isSameTag(item, value))) return;
    field.onChange([...values, value]);
  }

  function removeValue(value: string) {
    field.onChange(values.filter((item) => item !== value));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addDraft();
    } else if (event.key === 'Backspace' && !draft && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  }

  return (
    <Field
      className="min-w-0 gap-1.5"
      data-invalid={Boolean(errorMessage)}
      data-disabled={disabled}
    >
      <FieldLabel htmlFor={id} className="text-foreground text-xs leading-4 font-medium">
        {label}
      </FieldLabel>
      <div className="flex min-w-0 gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={Boolean(errorMessage)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            addDraft();
            field.onBlur();
          }}
          className="border-input bg-background h-9 min-w-0 rounded-lg px-3 text-base md:text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          disabled={disabled || !draft.trim()}
          onClick={addDraft}
          aria-label={`Agregar a ${label}`}
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value} className="max-w-full min-w-0">
              <Badge variant="secondary" className="h-6 max-w-full gap-1 pr-1">
                <span className="truncate">{value}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeValue(value)}
                  aria-label={`Quitar ${value}`}
                  className="hover:bg-muted-foreground/20 focus-visible:ring-ring rounded-full p-0.5 outline-none focus-visible:ring-2 disabled:pointer-events-none"
                >
                  <XIcon aria-hidden="true" className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
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
