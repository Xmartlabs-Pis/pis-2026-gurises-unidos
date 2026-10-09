import { Button } from '@/components/ui/button';
import { formatIncrement, formatNumber } from '@/lib/format';
import { getMetricSettings, getMetricValues, getReferenceYear } from '@/lib/metrics/queries';
import { getStatsColumnsClass } from '@/lib/metrics/stats-layout';
import { getPublicProjectsPage } from '@/lib/projects/public-projects';
import { getDepartmentBeneficiaries } from '@/lib/projects/department-beneficiaries';
import { TopicCarousel } from '@/components/projects/public-category-list';

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

const MAX_DEPARTMENT_BUBBLES = 4;
const FIRST_PROJECT_YEAR = 1989;

const PARTNERS = [
  'INAU',
  'INEFOP',
  'ANEP',
  'Ministerio del Interior',
  'Fundación Telefónica',
  'Fundación UPM',
  'Reaching U',
  'PepsiCo',
  'BASF',
  'OSF',
  'UNFPA',
];

export default async function Home() {
  const year = await getReferenceYear();
  const [values, previousValues, settings, departmentBeneficiaries, firstProjectsPage] =
    await Promise.all([
      getMetricValues(year),
      getMetricValues(year - 1),
      getMetricSettings(),
      getDepartmentBeneficiaries(year),
      getPublicProjectsPage(year, '1'),
    ]);
  const departmentBubbles = departmentBeneficiaries
    .slice(0, MAX_DEPARTMENT_BUBBLES)
    .map(({ department }) => department);
  const hiddenDepartments = departmentBeneficiaries.length - MAX_DEPARTMENT_BUBBLES;
  if (hiddenDepartments > 0) departmentBubbles.push(`+ ${hiddenDepartments} más`);
  const stats = settings
    .filter((metric) => metric.showPublicly)
    .map((metric) => ({
      key: metric.key,
      value: formatNumber(values[metric.key]),
      description: metric.name,
      increment: formatIncrement(values[metric.key], previousValues[metric.key], year - 1),
    }));

  return (
    <>
      <section className="w-full">
        <div className="mx-auto flex min-h-115.5 w-full flex-col gap-9 px-4 pt-13 pb-12 sm:px-6 lg:px-16">
          <div className="flex w-full flex-col gap-3 lg:h-48.5">
            <span className="bg-card text-primary flex h-6.5 w-42.5 items-center justify-center rounded-[20px] px-3 py-1.25 text-xs leading-4 font-medium tracking-normal">
              Informe de impacto · {year}
            </span>
            <h1 className="text-foreground w-full max-w-122 text-3xl leading-9 font-bold tracking-normal lg:h-24 lg:text-5xl lg:leading-12">
              Transformando vidas en Uruguay
            </h1>
            <p className="text-foreground w-full text-base leading-6 font-normal tracking-normal lg:h-12">
              Trabajamos con niños, niñas, adolescentes, familias y comunidades en todo el
              territorio uruguayo.
            </p>
          </div>
          <div
            className={`lg:bg-card grid w-full grid-cols-2 gap-3 lg:gap-0 lg:rounded-xl ${getStatsColumnsClass(stats.length)}`}
          >
            {stats.map((stat) => (
              <div
                key={stat.key}
                className="bg-card flex min-h-33 flex-col gap-1 rounded-xl px-4 py-6 max-lg:last:odd:col-span-2 lg:bg-transparent lg:px-8"
              >
                <span className="text-primary w-full text-3xl leading-9 font-bold tracking-normal lg:text-4xl lg:leading-10 lg:font-black">
                  {stat.value}
                </span>
                <span className="text-foreground w-full text-sm leading-5 font-normal tracking-normal">
                  {stat.description}
                </span>
                {stat.increment && (
                  <span className="text-primary w-full text-xs leading-4 font-normal tracking-normal">
                    {stat.increment}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-8 py-8 pl-5 lg:gap-12 lg:py-12 lg:pl-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
            Nuestros proyectos
          </h2>
          <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
            Organizados por tematica
          </p>
        </div>
        <TopicCarousel topic="Educacion" projects={firstProjectsPage.items} />
      </section>
      <section className="w-full">
        <div className="mx-auto flex w-full flex-col gap-7 px-5 py-8 sm:px-6 lg:px-16 lg:pt-12 lg:pb-12">
          <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:gap-16">
            <div className="flex flex-col gap-4 text-left">
              <div className="flex max-w-105 flex-col gap-1">
                <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
                  Presencia en todo Uruguay
                </h2>
                <p className="text-foreground text-sm leading-5 font-normal tracking-normal">
                  Nuestros proyectos llegan a {values.departments} departamentos, priorizando
                  comunidades con mayor vulnerabilidad social.
                </p>
              </div>
              <div className="flex max-w-105 flex-wrap gap-2">
                {departmentBubbles.map((department) => (
                  <span
                    key={department}
                    className="bg-card text-foreground flex h-6.5 items-center rounded-[14px] px-2.5 py-1.25 text-xs leading-4 font-normal tracking-normal"
                  >
                    {department}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-card flex h-50 w-full max-w-125 items-center justify-center rounded-xl px-5 py-15">
              <p className="text-muted-foreground text-center text-sm leading-5 font-normal tracking-normal">
                Mapa de Uruguay
                <br />
                {values.departments} departamentos cubiertos
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full">
        <div className="mx-auto flex min-h-77 w-full flex-col gap-7 px-5 py-8 sm:px-6 lg:px-14 lg:pt-12 lg:pb-14">
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
                <span className="text-primary text-sm font-bold">{level.number}</span>
                <h3 className="text-foreground text-lg leading-7 font-semibold">{level.title}</h3>
                <p className="text-muted-foreground text-sm leading-5">{level.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="w-full">
        <div className="mx-auto flex min-h-70 w-full max-w-360 flex-col gap-3 px-6 py-11 lg:px-14 lg:py-18">
          <h2 className="text-primary text-center text-xs leading-4 font-bold tracking-normal">
            NUESTRA MISIÓN
          </h2>
          <p className="text-foreground text-center text-xl leading-7 font-bold tracking-normal sm:text-3xl sm:leading-9 sm:font-medium">
            Hace {new Date().getFullYear() - FIRST_PROJECT_YEAR} años defendemos los derechos de la
            niñez y la adolescencia en Uruguay, transformando realidades junto a las comunidades.
          </p>
        </div>
      </section>
      <section className="w-full">
        <div className="mx-auto flex min-h-53.5 w-full flex-col gap-5 px-4 pt-12 pb-14 sm:px-6 lg:px-14">
          <div className="flex w-full max-w-126.5 flex-col gap-1">
            <h2 className="text-foreground text-xl leading-7 font-bold tracking-normal">
              Quienes nos acompañan
            </h2>
            <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
              Organismos públicos, fundaciones y aliados que hacen posible nuestro trabajo
            </p>
          </div>
          <div className="flex w-full max-w-332 flex-wrap gap-3">
            {PARTNERS.map((partner) => (
              <span
                key={partner}
                className="bg-card text-foreground flex h-9.5 items-center rounded-full px-4 py-2.25 text-sm leading-5 font-normal tracking-normal"
              >
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="w-full">
        <div className="mx-auto flex min-h-78 w-full max-w-360 flex-col gap-4 px-4 pt-18 pb-20 sm:px-6 lg:px-14">
          <h2 className="text-foreground text-center text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
            Sé parte de esta transformación
          </h2>
          <p className="text-muted-foreground text-center leading-6 font-normal tracking-normal">
            Conocé en qué proyectos podés colaborar y cómo tu apoyo se convierte en impacto real
            para miles de gurises.
          </p>
          <div className="mx-auto flex h-11 w-39.25 flex-col pt-2" hidden>
            <Button className="bg-foreground text-background hover:bg-foreground/90 h-9 w-full gap-2.5 px-4 py-2">
              Quiero colaborar
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
