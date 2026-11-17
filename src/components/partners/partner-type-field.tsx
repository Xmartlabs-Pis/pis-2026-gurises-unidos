'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { COUNTERPARTY_OPTIONS } from '@/lib/project-display';

type PartnerTypeFieldProps = {
  initialValue?: string | null;
  lockedValue?: string;
  disabled?: boolean;
  variant: 'create' | 'edit';
};

export function PartnerTypeField({
  initialValue = null,
  lockedValue,
  disabled = false,
  variant,
}: PartnerTypeFieldProps) {
  const locked = lockedValue !== undefined;
  const [value, setValue] = useState<string | null>(locked ? lockedValue : initialValue);
  const triggerClassName =
    variant === 'create'
      ? 'border-input bg-background w-full rounded-lg px-3 text-sm data-[size=default]:h-9 sm:w-56'
      : 'border-input bg-background w-full rounded-lg px-3 text-sm data-[size=default]:h-9';

  const select = (
    <Select
      items={COUNTERPARTY_OPTIONS}
      name={locked ? undefined : 'counterpartyType'}
      value={value}
      onValueChange={setValue}
      disabled={disabled || locked}
      required
    >
      <SelectTrigger aria-label="Tipo de contraparte" className={triggerClassName}>
        <SelectValue placeholder="Tipo de contraparte" className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent align="start">
        {COUNTERPARTY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (variant === 'create') return select;

  return (
    <div className="flex flex-col gap-1.5">
      {select}
      {locked && (
        <>
          <input type="hidden" name="counterpartyType" value={lockedValue} />
          <p className="text-muted-foreground text-xs">
            No se puede cambiar el tipo de un socio asociado a proyectos.
          </p>
        </>
      )}
    </div>
  );
}
