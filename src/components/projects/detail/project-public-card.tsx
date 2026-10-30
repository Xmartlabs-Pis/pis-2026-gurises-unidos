import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

type ProjectPublicCardProps = {
  name: string;
  description: string | null;
  coverPhoto: string | null;
};

export function ProjectPublicCard({ name, description, coverPhoto }: ProjectPublicCardProps) {
  return (
    <section className="border-border bg-card grid min-h-32 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 rounded-[14px] border p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4 sm:p-5">
      <div className="bg-project-cover relative aspect-video overflow-hidden rounded-lg">
        {coverPhoto && (
          <Image src={coverPhoto} alt={`Portada de ${name}`} fill className="object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Tarjeta pública</h2>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-5">
          {description ?? 'Este proyecto todavía no tiene una descripción pública.'}
        </p>
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
