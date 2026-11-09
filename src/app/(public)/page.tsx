import { getPublicPartners } from '@/lib/partners';
import { PartnerStrip } from '@/components/partner-strip';
import { formatIncrement } from '@/lib/format';
import { getMetricSettings, getMetricValues, getPublishedYears } from '@/lib/metrics/queries';
import { getPublicStats } from '@/lib/metrics/public-stats';
import { resolveYearParam } from '@/lib/metrics/year';
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

import { PublicHero } from '@/components/public-hero';
import { PublicCollaborate } from '@/components/public-collaborate';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const publishedYears = await getPublishedYears();
  const year = resolveYearParam((await searchParams).year, publishedYears, publishedYears[0]);
  const [values, previousValues, settings, partners, topics] = await Promise.all([
    getMetricValues(year),
    getMetricValues(year - 1),
    getMetricSettings(),
    getPublicPartners(),
    getPublishedTopics(year),
  ]);
  const stats = getPublicStats(settings, values).map((stat) => ({
    ...stat,
    increment: formatIncrement(values[stat.key], previousValues[stat.key], year - 1),
  }));

  return (
    <>
      <PublicHero
        year={year}
        years={publishedYears}
        title={
          <>
            Nuestro informe <span className="block">de impacto</span>
          </>
        }
      >
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
      </PublicHero>
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
      {partners.length > 0 && (
        <section aria-labelledby="partners-heading" className="w-full">
          <div className="mx-auto flex w-full max-w-360 flex-col items-center gap-6 px-5 pt-4 pb-16 text-center sm:px-6 lg:px-16 lg:pb-24">
            <h2
              id="partners-heading"
              className="text-foreground text-xs leading-4 font-bold tracking-[0.14em]"
            >
              CON EL APOYO DE
            </h2>
            <PartnerStrip partners={partners} />
          </div>
        </section>
      )}
      <PublicCollaborate />
      <PublicFooter topics={topics} years={publishedYears} year={year} />
    </>
  );
}
