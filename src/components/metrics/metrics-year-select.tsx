'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MetricsYearSelect({
  year,
  years,
  label = 'Año a mostrar en sitio público',
}: {
  year: number;
  years: number[];
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectYear(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="metrics-year"
        className="text-muted-foreground font-sans text-sm leading-5 font-normal tracking-normal"
      >
        {label}
      </label>
      <Select
        value={String(year)}
        onValueChange={(value) => {
          if (value !== null) selectYear(value);
        }}
        disabled={isPending}
      >
        <SelectTrigger
          id="metrics-year"
          aria-describedby="metrics-year-status"
          className="bg-background w-22 rounded-lg px-2.5 text-sm shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" className="min-w-22 rounded-lg p-1">
          {years.map((option) => (
            <SelectItem
              key={option}
              value={String(option)}
              className="rounded-md py-1 pl-2 text-sm"
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span id="metrics-year-status" role="status" className="sr-only">
        {isPending ? 'Cargando datos…' : ''}
      </span>
    </div>
  );
}
