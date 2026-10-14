'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type FormActionsProps = {
  onCancel?: () => void;
  submitLabel: string;
  pending: boolean;
  disabled?: boolean;
  secondaryAction?: ReactNode;
  form?: string;
};

export function FormActions(props: FormActionsProps) {
  const { onCancel, submitLabel, pending, disabled = false, secondaryAction, form } = props;
  return (
    <footer className="bg-background sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
      <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
        Cancelar
      </Button>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        {secondaryAction}
        <Button
          type="submit"
          form={form}
          size="lg"
          disabled={pending || disabled}
          className="flex-1 sm:min-w-36"
        >
          {pending ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </footer>
  );
}
