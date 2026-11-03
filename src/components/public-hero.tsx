import type { ReactNode } from 'react';
import { MetricsYearSelect } from '@/components/metrics/metrics-year-select';

export function PublicHero({
  year,
  years: publishedYears,
  title,
  children,
}: {
  year: number;
  years: number[];
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="public-hero w-full pt-16">
      <div className="mx-auto w-full max-w-360 px-4 pt-12 pb-20 sm:px-6 lg:px-16 lg:pt-14 lg:pb-24">
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center">
            {publishedYears.length > 1 ? (
              <MetricsYearSelect
                year={year}
                years={publishedYears}
                label="Año del informe"
                compact
              />
            ) : (
              <span className="public-hero-badge text-primary inline-flex min-h-9 items-center rounded-full px-3 py-1 text-sm font-semibold">
                {year}
              </span>
            )}
          </div>
          <h1 className="max-w-122 text-4xl leading-tight font-bold tracking-tight text-white lg:text-5xl">
            {title}
          </h1>
          <p className="max-w-140 text-base leading-6 text-white/90">
            Trabajamos con niños, niñas, adolescentes, familias y comunidades en el territorio
            uruguayo y la región.
          </p>
        </div>
      </div>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="text-background pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
      >
        <path d="M0 0 Q760 100 1440 62 V100 H0 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
