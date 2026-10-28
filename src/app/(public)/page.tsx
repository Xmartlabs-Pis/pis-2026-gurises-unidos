import { getContributors } from '@/lib/contributors';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';
import { formatIncrement, formatNumber } from '@/lib/format';
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
import { getTopicStatistics } from '@/lib/metrics/topic-statistics';
import { getVisibleTopics } from '@/lib/metrics/visible-topics';

const COLLABORATE_URL = 'https://gurisesunidos.org.uy/como-colaborar/';

const LEVELS = [
  {
    number: '01',
    title: 'Individual',
    description: 'Niños, niñas, adolescentes y jóvenes: acompañamiento directo y personalizado.',
  },
  {
    number: '02',
    title: 'Familiar',
    description: 'La familia como unidad: fortalecimiento de vínculos y entornos protectores.',
  },
  {
    number: '03',
    title: 'Institucional',
    description: 'Escuelas, centros de salud e instituciones que rodean a cada gurí.',
  },
  {
    number: '04',
    title: 'Comunitario',
    description: 'Territorios y comunidades donde se teje la red de protección.',
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const publishedYears = await getPublishedYears();
  const year = resolveYearParam((await searchParams).year, publishedYears, publishedYears[0]);
  const [values, previousValues, settings, topics, contributors] = await Promise.all([
    getMetricValues(year),
    getMetricValues(year - 1),
    getMetricSettings(),
    getTopicStatistics(year),
    getContributors(),
  ]);
  const stats = getPublicStats(settings, values).map((stat) => ({
    ...stat,
    increment: formatIncrement(values[stat.key], previousValues[stat.key], year - 1),
  }));

  const visibleTopics = getVisibleTopics(topics);
  const maxTopicProjectCount = Math.max(1, ...visibleTopics.map((topic) => topic.projectCount));

  return (
    <>
      <section className="w-full">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-9 px-4 pt-13 pb-12 sm:px-6 lg:px-16">
          <div className="flex w-full flex-col gap-3 lg:h-48.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="bg-card text-primary flex h-6.5 w-42.5 items-center justify-center rounded-[20px] px-3 py-1.25 text-xs leading-4 font-medium tracking-normal">
                Informe de impacto · {year}
              </span>
              {publishedYears.length > 1 && (
                <MetricsYearSelect
                  year={year}
                  years={publishedYears}
                  label="Año del informe"
                  className="bg-white! text-slate-900 [&_svg]:text-slate-600"
                />
              )}
            </div>
            <h1 className="text-foreground w-full max-w-122 text-3xl leading-9 font-bold tracking-normal lg:h-24 lg:text-5xl lg:leading-12">
              Transformando vidas en Uruguay
            </h1>
            <p className="text-foreground w-full text-base leading-6 font-normal tracking-normal lg:h-12">
              Trabajamos con niños, niñas, adolescentes, familias y comunidades en todo el
              territorio uruguayo.
            </p>
          </div>
          {stats.length > 0 && (
            <div
              role="group"
              aria-label={`Impacto ${year}`}
              className={`lg:bg-card grid w-full grid-cols-2 gap-3 lg:gap-0 lg:rounded-xl ${getStatsColumnsClass(stats.length)}`}
            >
              {stats.map((stat) => (
                <div
                  key={stat.key}
                  className="bg-card flex min-h-33 flex-col gap-1 rounded-xl px-4 py-6 max-lg:last:odd:col-span-2 lg:bg-transparent lg:px-8"
                >
                  <span className="text-foreground w-full text-3xl leading-9 font-bold tracking-normal lg:text-4xl lg:leading-10 lg:font-black">
                    {stat.value}
                  </span>
                  <span className="text-foreground w-full text-sm leading-5 font-normal tracking-normal">
                    {stat.description}
                  </span>
                  {stat.increment && (
                    <span className="text-primary w-full text-xs leading-4 font-bold tracking-normal">
                      {stat.increment}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {visibleTopics.length > 0 && (
        <section aria-labelledby="public-topic-statistics-heading" className="w-full">
          <div className="mx-auto flex w-full max-w-360 flex-col gap-5 px-4 pt-14 pb-14 sm:px-6 lg:px-16">
            <div className="flex flex-col gap-1">
              <h2
                id="public-topic-statistics-heading"
                className="text-foreground text-2xl leading-8 font-bold sm:text-3xl sm:leading-9"
              >
                Proyectos por temática
              </h2>
              <p className="text-muted-foreground text-sm">
                Proyectos con actividad registrada en {year}
              </p>
            </div>
            <dl className="grid w-full max-w-246 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-5 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-x-6">
              {visibleTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="col-span-full grid grid-cols-subgrid items-center gap-y-2"
                >
                  <dt className="text-foreground text-sm leading-5 font-medium">{topic.name}</dt>
                  <dd className="contents">
                    <div
                      aria-hidden="true"
                      className="bg-card col-span-2 row-start-2 h-3 overflow-hidden rounded-full sm:col-span-1 sm:col-start-2 sm:row-start-1"
                    >
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${(topic.projectCount / maxTopicProjectCount) * 100}%` }}
                      />
                    </div>
                    <span className="col-start-2 row-start-1 flex items-baseline gap-2 whitespace-nowrap sm:col-start-3">
                      <span className="text-foreground text-2xl leading-8 font-bold tabular-nums">
                        {formatNumber(topic.projectCount)}
                      </span>
                      <span className="text-foreground text-sm leading-5">
                        {topic.projectCount === 1 ? 'proyecto' : 'proyectos'}
                      </span>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
      <section id="projects" className="w-full scroll-mt-4">
        <div
          className={`mx-auto flex min-h-71 w-full max-w-360 flex-col gap-4 px-4 pb-18 sm:px-6 lg:px-14 ${visibleTopics.length > 0 ? 'pt-6' : 'pt-18'}`}
        >
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
      <section className="w-full">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-7 px-5 py-8 sm:px-6 lg:px-16 lg:pt-12 lg:pb-12">
          <Suspense fallback={<DepartmentPresenceSkeleton />}>
            <DepartmentPresence />
          </Suspense>
        </div>
      </section>
      <section className="w-full">
        <div className="mx-auto flex min-h-77 w-full max-w-360 flex-col gap-7 px-5 py-8 sm:px-6 lg:px-14 lg:pt-12 lg:pb-14">
          <div className="flex min-h-14 w-full max-w-93.75 flex-col gap-1">
            <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal">
              Cómo trabajamos
            </h2>
            <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
              Acompañamos en cuatro niveles que se potencian entre sí
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((level) => (
              <div
                key={level.number}
                className="border-primary flex flex-col gap-2 pt-4 lg:border-t-2"
              >
                <span className="text-foreground text-sm font-bold">{level.number}</span>
                <h3 className="text-foreground text-lg leading-7 font-semibold">{level.title}</h3>
                <p className="text-muted-foreground text-sm leading-5">{level.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="w-full py-8 lg:py-12">
        <div className="mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-16">
          <div className="bg-card flex min-h-70 w-full flex-col gap-3 rounded-xl px-6 py-11 lg:px-14 lg:py-18">
            <h2 className="text-primary text-center text-xs leading-4 font-bold tracking-normal">
              NUESTRA MISIÓN
            </h2>
            <p className="text-foreground text-center text-xl leading-7 font-bold tracking-normal sm:text-3xl sm:leading-9 sm:font-medium">
              Hace {new Date().getFullYear() - FIRST_PROJECT_YEAR} años defendemos los derechos de
              la niñez y la adolescencia en Uruguay, transformando realidades junto a las
              comunidades.
            </p>
          </div>
        </div>
      </section>
      {contributors.length > 0 && (
        <section className="w-full">
          <div className="mx-auto flex min-h-53.5 w-full max-w-360 flex-col gap-5 px-4 pt-12 pb-14 sm:px-6 lg:px-14">
            <div className="flex w-full max-w-126.5 flex-col gap-1">
              <h2 className="text-foreground text-xl leading-7 font-bold tracking-normal">
                Quienes nos acompañan
              </h2>
              <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
                Organismos públicos, fundaciones y aliados que hacen posible nuestro trabajo
              </p>
            </div>
            <div className="flex w-full max-w-332 flex-wrap gap-3">
              {contributors.map((contributor) => (
                <span
                  key={contributor.id}
                  className="bg-card text-foreground flex min-h-9.5 max-w-full items-center rounded-full px-4 py-2.25 text-sm leading-5 font-normal tracking-normal break-words"
                >
                  {contributor.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="w-full pt-8 pb-12 lg:pt-12 lg:pb-18">
        <div className="mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-16">
          <div className="bg-card flex w-full flex-col gap-4 rounded-xl px-4 pt-12 pb-8 sm:px-6 lg:px-14">
            <h2 className="text-foreground text-center text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
              Sé parte de esta transformación
            </h2>
            <p className="text-muted-foreground text-center leading-6 font-normal tracking-normal">
              Conocé en qué proyectos podés colaborar y cómo tu apoyo se convierte en impacto real
              para miles de gurises.
            </p>
            <div className="mx-auto flex h-11 w-39.25 flex-col pt-2">
              <a
                href={COLLABORATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants(),
                  'text-foreground hover:bg-primary/70 hover:text-foreground h-9 w-full gap-2.5 bg-white px-4 py-2'
                )}
              >
                Quiero colaborar
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
