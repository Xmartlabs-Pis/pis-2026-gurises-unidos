import Image from 'next/image';
import Link from 'next/link';
import { cn } from 'cn';
import { buttonVariants } from '@/components/ui/button';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

type ProjectPublicCardProps = {
  name: string;
  coverPhoto: string | null;
};

export function ProjectPublicCard({ name, coverPhoto }: ProjectPublicCardProps) {
  return (
    <section className="border-border bg-card grid min-h-32 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 rounded-[14px] border p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4 sm:p-5">
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-lg',
          !coverPhoto && 'bg-project-cover'
        )}
      >
        {coverPhoto && (
          <Image
            src={coverPhoto}
            alt={`Portada de ${name}`}
            fill
            unoptimized={isUploadedCoverPath(coverPhoto)}
            className="object-cover"
          />
        )}
      </div>
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
