'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { GEOGRAPHIC_REGIONS } from '@/lib/projects/geographic-regions';
import { usePublicGeography } from '@/components/public-geography';

const FOOTER_LINK_CLASS =
  'text-[#b3cbc1] underline underline-offset-2 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

export function PublicFooter({
  topics,
  years,
  year,
}: {
  topics: { id: number; name: string }[];
  years: number[];
  year: number;
}) {
  const navigation = usePublicGeography();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const geographies = [{ id: 'uruguay', name: 'Uruguay' }, ...GEOGRAPHIC_REGIONS];

  function yearHref(value: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(value));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <footer className="bg-surface-brand-deep text-white">
      <div className="mx-auto grid w-full max-w-360 gap-10 px-5 pt-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.1fr_1.3fr_0.85fr_1fr] lg:gap-16 lg:px-16 lg:pb-24">
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
            {topics.map((topic) => (
              <li key={topic.id}>{topic.name}</li>
            ))}
          </ul>
        </div>
        <nav aria-label="Informes anuales" aria-busy={isPending} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Informes anuales</h2>
          <ul className="flex flex-col gap-2">
            {years.map((option) => (
              <li key={option}>
                <a
                  href={yearHref(option)}
                  aria-current={option === year ? 'true' : undefined}
                  className={FOOTER_LINK_CLASS}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    startTransition(() => router.push(yearHref(option), { scroll: false }));
                    window.scrollTo({
                      top: 0,
                      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'instant'
                        : 'smooth',
                    });
                  }}
                >
                  {option}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Impacto por región" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Impacto por región</h2>
          <ul className="flex flex-col gap-2">
            {geographies.map((geography) => (
              <li key={geography.id}>
                <a
                  href="#department-presence"
                  className={FOOTER_LINK_CLASS}
                  onClick={() => navigation?.selectGeography(geography.id)}
                >
                  {geography.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
