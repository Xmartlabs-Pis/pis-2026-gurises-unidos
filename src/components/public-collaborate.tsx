import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

const COLLABORATE_URL = 'https://gurisesunidos.org.uy/como-colaborar/';

export function PublicCollaborate() {
  return (
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
          Conocé en qué proyectos podés colaborar y cómo tu apoyo se convierte en impacto real para
          miles de gurises.
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
  );
}
