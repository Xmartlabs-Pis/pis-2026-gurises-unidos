import type { ReactNode } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

type ErrorCopy = {
  title: string;
  description: string;
};

const ERROR_COPY: Record<number, ErrorCopy> = {
  400: {
    title: 'Solicitud inválida',
    description:
      'No pudimos procesar el pedido. Revisá la dirección o los datos e intentá de nuevo.',
  },
  404: {
    title: 'Página no encontrada',
    description: 'La página que buscás no existe o fue movida.',
  },
  500: {
    title: 'Algo salió mal',
    description: 'Tuvimos un problema inesperado. Intentá de nuevo en unos minutos.',
  },
  403: {
    title: 'Acceso denegado',
    description: 'No tenés permisos para acceder a esta página.',
  },
};

const FALLBACK_COPY: ErrorCopy = {
  title: 'Ocurrió un error',
  description: 'No pudimos completar lo que pediste.',
};

type ErrorScreenProps = {
  code: number;
  title?: string;
  description?: string;
  reference?: string;
  actions?: ReactNode;
  homeHref?: string; // Public pages pass "/" so anonymous visitors are not sent to login
};

export function ErrorScreen({
  code,
  title,
  description,
  reference,
  actions,
  homeHref = '/dashboard',
}: ErrorScreenProps) {
  const copy = ERROR_COPY[code] ?? FALLBACK_COPY;

  return (
    <div className="flex flex-1 flex-col items-center justify-center-safe px-6 py-24 text-center">
      <p className="text-muted-foreground text-7xl font-semibold tracking-tight tabular-nums sm:text-8xl">
        {code}
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title ?? copy.title}</h1>
      <p className="text-muted-foreground mt-3 max-w-xl text-base leading-relaxed">
        {description ?? copy.description}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {actions}
        <Link
          href={homeHref}
          className={buttonVariants({ variant: actions ? 'outline' : 'default', size: 'lg' })}
        >
          Volver al inicio
        </Link>
      </div>
      {reference && (
        <p className="text-muted-foreground mt-10 font-mono text-xs">Referencia: {reference}</p>
      )}
    </div>
  );
}
