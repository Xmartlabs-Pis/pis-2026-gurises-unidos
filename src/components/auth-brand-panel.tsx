import type { ReactNode } from 'react';
import Image from 'next/image';

export function AuthBrandPanel({ children }: { children?: ReactNode }) {
  return (
    <div className="theme-public auth-brand-panel bg-surface-brand-deep flex grow flex-col place-content-center gap-4.5 pt-8 pr-6 pb-8 pl-6 lg:gap-12 lg:p-18">
      <div className="flex flex-col gap-4">
        <p className="text-primary text-xs leading-4 font-medium tracking-[6%]">
          PLATAFORMA DE GESTIÓN E IMPACTO
        </p>
        <p className="text-foreground text-3xl leading-10 font-bold tracking-normal lg:text-4xl">
          Cada dato cuenta una historia de impacto.
        </p>
        <p className="text-muted-foreground text-base leading-6 font-normal tracking-normal">
          Gestioná proyectos, territorios y las personas que Gurises Unidos acompaña — todo en un
          mismo lugar.
        </p>
      </div>
      <Image
        src="/images/login-image.svg"
        width={600}
        height={300}
        fetchPriority="high"
        className="hidden aspect-auto w-150 lg:flex"
        alt="Red de Impacto"
      />
      {children}
    </div>
  );
}
