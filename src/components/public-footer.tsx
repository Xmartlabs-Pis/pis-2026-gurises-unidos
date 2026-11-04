'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { GEOGRAPHIC_REGIONS } from '@/lib/projects/geographic-regions';
import { usePublicGeography } from '@/components/public-geography';

const FOOTER_LINK_CLASS =
  'text-[#b3cbc1] underline underline-offset-2 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';
const MAX_FOOTER_ITEMS = 5;

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}

export function PublicFooter({
  topics,
  years,
  year,
  curved = false,
}: {
  topics: { id: number; name: string }[];
  years: number[];
  year: number;
  curved?: boolean;
}) {
  const navigation = usePublicGeography();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const geographies = [{ id: 'uruguay', name: 'Uruguay' }, ...GEOGRAPHIC_REGIONS];
  const hasMoreTopics = topics.length > MAX_FOOTER_ITEMS;
  const hasMoreYears = years.length > MAX_FOOTER_ITEMS;
  const visibleTopics = hasMoreTopics ? topics.slice(0, MAX_FOOTER_ITEMS - 1) : topics;
  const visibleYears = hasMoreYears ? years.slice(0, MAX_FOOTER_ITEMS - 1) : years;

  function yearHref(value: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(value));
    return `/?${params.toString()}`;
  }

  return (
    <footer className={`bg-surface-brand-deep relative text-white ${curved ? 'pt-16' : ''}`}>
      {curved && (
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="text-background pointer-events-none absolute inset-x-0 top-0 h-12 w-full"
        >
          <path d="M0 0 H1440 V60 Q720 -60 0 60 Z" fill="currentColor" />
        </svg>
      )}
      <div className="mx-auto grid w-full max-w-360 gap-10 px-5 pt-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-16 lg:px-16 lg:pb-24">
        <div className="flex flex-col items-start gap-4">
          <Image
            src="/images/gurises-unidos-footer.svg"
            alt="Gurises Unidos"
            width={128}
            height={88}
          />
          <p className="text-[#b3cbc1]">Transformando vidas.</p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Proyectos</h2>
          <ul className="flex flex-col gap-2 text-[#b3cbc1]">
            {visibleTopics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/projects?year=${year}#topic-${topic.id}`}
                  className={FOOTER_LINK_CLASS}
                >
                  {topic.name}
                </Link>
              </li>
            ))}
            {hasMoreTopics && (
              <li>
                <Link
                  href={`/projects?year=${year}`}
                  className={FOOTER_LINK_CLASS}
                  onClick={(event) => {
                    if (
                      pathname !== '/projects' ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    scrollToTop();
                  }}
                >
                  Ver todos
                </Link>
              </li>
            )}
          </ul>
        </div>
        <nav aria-label="Informes anuales" aria-busy={isPending} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Informes anuales</h2>
          <ul className="flex flex-col gap-2">
            {visibleYears.map((option) => (
              <li key={option}>
                <a
                  href={yearHref(option)}
                  aria-current={option === year ? 'true' : undefined}
                  className={FOOTER_LINK_CLASS}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    startTransition(() => router.push(yearHref(option), { scroll: false }));
                    scrollToTop();
                  }}
                >
                  {option}
                </a>
              </li>
            ))}
            {hasMoreYears && (
              <li>
                <button type="button" className={FOOTER_LINK_CLASS} onClick={scrollToTop}>
                  Ver todos
                </button>
              </li>
            )}
          </ul>
        </nav>
        <nav aria-label="Impacto por región" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Impacto por región</h2>
          <ul className="flex flex-col gap-2">
            {geographies.map((geography) => (
              <li key={geography.id}>
                <Link
                  href={
                    pathname === '/' ? '#department-presence' : `/?year=${year}#department-presence`
                  }
                  className={FOOTER_LINK_CLASS}
                  onClick={() => navigation?.selectGeography(geography.id)}
                >
                  {geography.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
