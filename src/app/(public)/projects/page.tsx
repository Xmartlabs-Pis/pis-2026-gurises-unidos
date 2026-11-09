import { PublicHero } from '@/components/public-hero';
import { PublicFooter } from '@/components/public-footer';
import { ProjectsByTopic } from '@/components/projects/projects-by-topic';
import { getPublishedYears } from '@/lib/metrics/queries';
import { resolveYearParam } from '@/lib/metrics/year';
import { getPublishedTopics } from '@/lib/projects/public-projects';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export const metadata = { title: 'Todos nuestros proyectos | Gurises Unidos' };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const { year: yearParam } = await searchParams;
  const years = await getPublishedYears();
  const year = resolveYearParam(yearParam, years, years[0]);
  const [topics, carousels] = await Promise.all([
    getPublishedTopics(year),
    ProjectsByTopic({ year }),
  ]);

  return (
    <>
      <PublicHero
        year={year}
        years={years}
        action={
          <Link
            href={`/?year=${year}`}
            className={buttonVariants({
              variant: 'outline',
              className:
                'h-9 border-white/30 bg-transparent px-3 text-white hover:bg-white/10 hover:text-white',
            })}
          >
            <ArrowLeft aria-hidden="true" />
            Volver al informe
          </Link>
        }
        title={
          <>
            Todos nuestros <span className="block">proyectos</span>
          </>
        }
      >
        <div className="public-hero-stats relative h-24">
          <svg
            aria-hidden="true"
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="public-hero-wave pointer-events-none absolute inset-x-0 -top-16 h-16 w-full"
          >
            <path d="M0 78 Q720 90 1440 0 V80 H0 Z" fill="currentColor" />
          </svg>
        </div>
      </PublicHero>
      <section id="projects" aria-label="Proyectos por temática" className="w-full scroll-mt-20">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-12 px-5 py-12 sm:px-6 lg:gap-16 lg:px-16 lg:py-16">
          {carousels}
        </div>
      </section>
      <PublicFooter topics={topics} years={years} year={year} curved />
    </>
  );
}
