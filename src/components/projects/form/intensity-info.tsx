'use client';

import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { INTENSITY_DESCRIPTION, INTENSITY_OPTIONS } from '@/lib/project-display';

export function IntensityInfo() {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        aria-label="Ver qué significa cada nivel de intensidad"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-xs">
        <PopoverTitle>Niveles de intensidad</PopoverTitle>
        <dl className="flex flex-col gap-1.5">
          {INTENSITY_OPTIONS.map(({ value, label }) => (
            <div key={value}>
              <dt className="font-medium">{label}</dt>
              <dd className="text-muted-foreground">{INTENSITY_DESCRIPTION[value]}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
