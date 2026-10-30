'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ProjectYearSelector({ year, years }: { year: number; years: number[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectYear(value: string | number) {
    startTransition(() => router.push(`${pathname}?year=${value}`, { scroll: false }));
  }

  return (
    <div>
      <Select
        value={String(year)}
        onValueChange={(value) => {
          if (value !== null) selectYear(value);
        }}
        disabled={isPending}
      >
        <SelectTrigger aria-label="Seleccionar año" className="bg-background h-9 min-w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {years.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span role="status" className="sr-only">
        {isPending ? 'Cargando datos…' : ''}
      </span>
    </div>
  );
}
