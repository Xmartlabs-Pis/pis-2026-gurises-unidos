import { getContributors } from '@/lib/contributors';
import { ContributorStrip } from '@/components/contributor-strip';
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
import { HowWeWork } from '@/components/how-we-work';
import { RegionPresence } from '@/components/map/region-presence';
import { RegionPresenceSkeleton } from '@/components/map/region-presence-skeleton';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicGeographyTabs } from '@/components/public-geography';
import { PublicFooter } from '@/components/public-footer';
import { getPublishedTopics } from '@/lib/projects/public-projects';

const COLLABORATE_URL = 'https://gurisesunidos.org.uy/como-colaborar/';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const publishedYears = await getPublishedYears();
  const year = resolveYearParam((await searchParams).year, publishedYears, publishedYears[0]);
  const [values, previousValues, settings, contributors, topics] = await Promise.all([
    getMetricValues(year),
    getMetricValues(year - 1),
    getMetricSettings(),
    getContributors(),
    getPublishedTopics(),
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
      <section id="department-presence" className="w-full scroll-mt-16">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-6 px-5 py-12 sm:px-6 lg:px-16 lg:py-16">
          <h2 className="text-foreground text-center text-2xl leading-8 font-bold">
            Nuestro impacto por geografía
          </h2>
          <PublicGeographyTabs>
            <TabsList
              aria-label="Seleccionar geografía"
              className="bg-card mx-auto h-11! w-64 rounded-full p-1"
            >
              <TabsTrigger value="uruguay" className="rounded-full px-5 data-active:bg-white">
                Uruguay
              </TabsTrigger>
              <TabsTrigger value="region" className="rounded-full px-5 data-active:bg-white">
                Región
              </TabsTrigger>
            </TabsList>
            <TabsContent value="uruguay">
              <Suspense fallback={<DepartmentPresenceSkeleton />}>
                <DepartmentPresence year={year} />
              </Suspense>
            </TabsContent>
            <TabsContent value="region">
              <Suspense fallback={<RegionPresenceSkeleton />}>
                <RegionPresence year={year} />
              </Suspense>
            </TabsContent>
          </PublicGeographyTabs>
        </div>
      </section>
      <section id="how-we-work" className="w-full scroll-mt-16">
        <HowWeWork />
      </section>
      <section id="mission" className="w-full scroll-mt-16">
        <div className="mx-auto flex w-full max-w-360 flex-col items-center gap-6 px-5 pt-16 pb-12 text-center sm:px-6 lg:px-16 lg:pt-24 lg:pb-16">
          <h2 className="text-foreground text-xs leading-4 font-bold tracking-[0.14em]">
            NUESTRA MISIÓN
          </h2>
          <p className="text-foreground max-w-260 text-2xl leading-9 font-medium sm:text-3xl sm:leading-10">
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
              className="text-foreground text-xs leading-4 font-bold tracking-[0.14em]"
            >
              CON EL APOYO DE
            </h2>
            <ContributorStrip contributors={contributors} />
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
              'text-foreground hover:bg-primary hover:text-foreground min-h-10 bg-white px-5 py-2 font-bold'
            )}
          >
            Quiero colaborar
          </a>
        </div>
      </section>
      <PublicFooter topics={topics} years={publishedYears} year={year} />
    </>
  );
}
