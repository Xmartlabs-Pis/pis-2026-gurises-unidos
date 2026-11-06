import Link from 'next/link';
import { cn } from 'cn';
import { CoverFrame } from '@/components/projects/cover/cover-frame';
import { buttonVariants } from '@/components/ui/button';

type ProjectPublicCardProps = {
  name: string;
  coverPhoto: string | null;
  coverCrop?: unknown;
};

export function ProjectPublicCard({ name, coverPhoto, coverCrop }: ProjectPublicCardProps) {
  return (
    <section className="border-border bg-card grid min-h-32 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 rounded-[14px] border p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4 sm:p-5">
      <CoverFrame
        src={coverPhoto}
        alt={coverPhoto ? `Portada de ${name}` : ''}
        crop={coverCrop}
        sizes="(min-width: 640px) 10rem, 7rem"
        className={cn('rounded-lg', !coverPhoto && 'bg-project-cover')}
      />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Tarjeta pública</h2>
        <Link
          href="/"
          className={buttonVariants({
            variant: 'link',
            className: 'text-foreground mt-2 h-auto p-0',
          })}
        >
          Ver vista pública →
        </Link>
      </div>
    </section>
  );
}
