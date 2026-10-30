'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png'];

type ImageUploadFieldProps = {
  id: string;
  name?: string;
  label: string;
  value: File | null;
  imageUrl?: string | null;
  onValueChange: (value: File | null) => void;
  onRemoveSaved?: () => void;
};

export function ImageUploadField({
  id,
  name,
  label,
  value,
  imageUrl,
  onValueChange,
  onRemoveSaved,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const errorId = `${id}-error`;

  useEffect(() => {
    if (!value && inputRef.current) inputRef.current.value = '';
  }, [value]);

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <Field className="min-w-0 gap-1.5">
      <FieldLabel htmlFor={id} className="text-foreground text-xs leading-4 font-medium">
        {label}
      </FieldLabel>
      <div className="h-0 w-0 overflow-hidden">
        <input
          ref={inputRef}
          name={name}
          form="cover-photo-detached"
          type="file"
          accept={IMAGE_TYPES.join(',')}
          aria-hidden="true"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;

            if (!IMAGE_TYPES.includes(file.type)) {
              setError('La imagen debe ser JPG o PNG.');
              event.currentTarget.value = '';
              return;
            }

            if (file.size > MAX_IMAGE_SIZE) {
              setError('La imagen no puede superar los 5 MB.');
              event.currentTarget.value = '';
              return;
            }

            setError(undefined);
            onValueChange(file);
          }}
        />
      </div>
      <Button
        id={id}
        type="button"
        variant="ghost"
        title={value?.name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="border-input bg-muted text-muted-foreground hover:bg-accent h-auto min-h-18 w-full min-w-0 shrink rounded-lg border px-4 py-3 text-center text-xs leading-4 font-normal"
        onClick={openPicker}
      >
        {value ? (
          <span className="flex max-w-full min-w-0 items-center justify-center">
            <span className="truncate">{value.name}</span>
            <span className="shrink-0"> · Cambiar imagen</span>
          </span>
        ) : imageUrl ? (
          'Cambiar imagen'
        ) : (
          'Clic para subir imagen (JPG, PNG, máx. 5MB)'
        )}
      </Button>
      {(value || onRemoveSaved) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-foreground self-start"
          onClick={() => {
            if (value) {
              if (inputRef.current) inputRef.current.value = '';
              setError(undefined);
              onValueChange(null);
              return;
            }
            onRemoveSaved?.();
          }}
        >
          Quitar foto
        </Button>
      )}
      <FieldError id={errorId} className="text-xs leading-4">
        {error}
      </FieldError>
    </Field>
  );
}
