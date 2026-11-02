import { getContributors } from '@/lib/contributors';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';
import { formatIncrement } from '@/lib/format';
import { getMetricSettings, getMetricValues, getPublishedYears } from '@/lib/metrics/queries';
import { getPublicStats } from '@/lib/metrics/public-stats';
import { resolveYearParam } from '@/lib/metrics/year';
import { MetricsYearSelect } from '@/components/metrics/metrics-year-select';
import { FIRST_PROJECT_YEAR } from '@/lib/project-display';
import { getStatsColumnsClass } from '@/lib/metrics/stats-layout';
import { Suspense } from 'react';
import { DepartmentPresence } from '@/components/map/department-presence';
import { DepartmentPresenceSkeleton } from '@/components/map/department-presence-skeleton';
import { ProjectsByTopic } from '@/components/projects/projects-by-topic';
import { TopicCarouselSkeleton } from '@/components/projects/topic-carousel-skeleton';
import { HowWeWork } from '@/components/how-we-work';

const COLLABORATE_URL = 'https://gurisesunidos.org.uy/como-colaborar/';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const publishedYears = await getPublishedYears();
  const year = resolveYearParam((await searchParams).year, publishedYears, publishedYears[0]);
  const [values, previousValues, settings, contributors] = await Promise.all([
    getMetricValues(year),
    getMetricValues(year - 1),
    getMetricSettings(),
    getContributors(),
  ]);
  const stats = getPublicStats(settings, values).map((stat) => ({
    ...stat,
    increment: formatIncrement(values[stat.key], previousValues[stat.key], year - 1),
  }));

  return (
    <>
      <section className="public-hero w-full">
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
              Nuestro informe <span className="block">de impacto</span>
            </h1>
            <p className="max-w-140 text-base leading-6 text-white/90">
              Trabajamos con niños, niñas, adolescentes, familias y comunidades en todo el
              territorio uruguayo.
            </p>
          </div>
        </div>
        {stats.length > 0 && (
          <div className="public-hero-stats relative pb-20">
            <svg
              aria-hidden="true"
              viewBox="0 0 1440 80"
              preserveAspectRatio="none"
              className="public-hero-wave pointer-events-none absolute inset-x-0 -top-16 h-16 w-full"
            >
              <path d="M0 78 Q720 90 1440 0 V80 H0 Z" fill="currentColor" />
            </svg>
            <div className="mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-16">
              <div
                role="group"
                aria-label={`Impacto ${year}`}
                className={`grid w-full grid-cols-2 gap-x-6 gap-y-8 pt-8 lg:gap-x-0 ${getStatsColumnsClass(stats.length)}`}
              >
                {stats.map((stat) => (
                  <div
                    key={stat.key}
                    className="flex flex-col gap-1 max-lg:last:odd:col-span-2 lg:px-8"
                  >
                    <span className="text-primary text-3xl leading-9 font-black lg:text-4xl lg:leading-10">
                      {stat.value}
                    </span>
                    <span className="text-sm leading-5 text-white/90">{stat.description}</span>
                    {stat.increment && (
                      <span className="text-primary text-xs leading-4 font-bold">
                        {stat.increment}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          className="text-background pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
        >
          <path d="M0 0 Q760 100 1440 62 V100 H0 Z" fill="currentColor" />
        </svg>
      </section>
      <section id="projects" className="w-full scroll-mt-4">
        <div className="mx-auto flex min-h-71 w-full max-w-360 flex-col gap-6 px-4 py-18 sm:px-6 lg:px-14">
          <div className="flex w-full max-w-75.75 flex-col gap-1 lg:h-15">
            <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
              Nuestros proyectos
            </h2>
            <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
              Organizados por temática
            </p>
          </div>
          <Suspense key={year} fallback={<TopicCarouselSkeleton />}>
            <ProjectsByTopic year={year} />
          </Suspense>
        </div>
      </section>
      <section id="department-presence" className="w-full scroll-mt-16">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-7 px-5 py-8 sm:px-6 lg:px-16 lg:pt-12 lg:pb-12">
          <Suspense fallback={<DepartmentPresenceSkeleton />}>
            <DepartmentPresence year={year} />
          </Suspense>
        </div>
      </section>
      <section id="how-we-work" className="w-full scroll-mt-16">
        <HowWeWork />
      </section>
      <section id="mission" className="w-full scroll-mt-16">
        <div className="mx-auto flex w-full max-w-360 flex-col items-center gap-6 px-5 pt-16 pb-12 text-center sm:px-6 lg:px-16 lg:pt-24 lg:pb-16">
          <h2 className="text-xs leading-4 font-bold tracking-[0.14em] text-[#52766b]">
            NUESTRA MISIÓN
          </h2>
          <p className="max-w-260 text-2xl leading-9 font-medium text-[#3d7115] sm:text-3xl sm:leading-10">
            Hace {new Date().getFullYear() - FIRST_PROJECT_YEAR} años defendemos los derechos de la
            niñez y la adolescencia en Uruguay, transformando realidades junto a las comunidades.
          </p>
        </div>
      </section>
      {contributors.length > 0 && (
        <section aria-labelledby="contributors-heading" className="w-full">
          <div className="mx-auto flex w-full max-w-360 flex-col items-center gap-6 px-5 pt-4 pb-16 text-center sm:px-6 lg:px-16 lg:pb-24">
            <h2
              id="contributors-heading"
              className="text-xs leading-4 font-bold tracking-[0.14em] text-[#52766b]"
            >
              CON EL APOYO DE
            </h2>
            <ul className="flex w-full flex-wrap justify-center gap-3">
              {contributors.map((contributor) => (
                <li
                  key={contributor.id}
                  className="bg-card text-foreground flex min-h-10 max-w-full items-center justify-center rounded-full px-5 py-2 text-sm leading-5 font-medium break-words"
                >
                  {contributor.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <section className="public-collaborate relative w-full text-white">
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="text-background pointer-events-none absolute inset-x-0 top-0 h-12 w-full"
        >
          <path d="M0 0 H1440 V60 Q720 -60 0 60 Z" fill="currentColor" />
        </svg>
        <div className="mx-auto flex w-full max-w-360 flex-col items-center gap-6 px-5 pt-24 pb-20 text-center sm:px-6 lg:px-16">
          <h2 className="text-2xl leading-8 font-bold sm:text-3xl sm:leading-9">
            Sé parte de esta transformación
          </h2>
          <p className="max-w-180 text-base leading-6 text-[#b3cbc1]">
            Conocé en qué proyectos podés colaborar y cómo tu apoyo se convierte en impacto real
            para miles de gurises.
          </p>
          <a
            href={COLLABORATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants(),
              'text-foreground hover:bg-primary/70 hover:text-foreground min-h-10 bg-white px-5 py-2 font-bold'
            )}
          >
            Quiero colaborar
          </a>
        </div>
      </section>
      <footer className="bg-surface-brand-deep px-5 pb-6 text-center">
        <a
          href="/login"
          className="text-xs text-white/60 underline-offset-4 hover:text-white hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Acceso al equipo
        </a>
      </footer>
    </>
  );
}
