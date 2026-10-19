import { Suspense } from 'react';
import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import icon from '@/app/icon.png';
import loginImage from '@/assets/login-image.png';
import { version } from '@/lib/version';
import { formatNumber } from '@/lib/format';
import prisma from '@/lib/prisma';
import { sumBeneficiaryValues } from '@/lib/projects/beneficiary-values';
import { ErrorBoundary } from '@/components/error-boundary';
import { connection } from 'next/server';
import { SESSION_EXPIRATION_REASON } from '@/lib/auth/session-expiration';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 lg:gap-1">
      <p className="text-foreground text-3xl leading-9 font-bold tracking-normal">{value}</p>
      <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">{label}</p>
    </div>
  );
}

async function Stats() {
  await connection();
  const [activeProjects, totalReach, territories] = await Promise.all([
    prisma.project.count({
      where: {
        status: 'active',
        deletedAt: null,
      },
    }),
    sumBeneficiaryValues({ project: { deletedAt: null } }),
    prisma.department.count(),
  ]);

  return (
    <div className="flex flex-row gap-3 pt-2 lg:gap-10 lg:pt-0">
      <Stat value={String(activeProjects)} label="Proyectos activos" />
      <Stat value={`+${formatNumber(totalReach)}`} label="Personas alcanzadas" />
      <Stat value={String(territories)} label="Territorios" />
    </div>
  );
}

function StatsFallback() {
  return (
    <div className="flex flex-row gap-3 pt-2 lg:gap-10 lg:pt-0">
      <Stat value="0" label="Proyectos activos" />
      <Stat value="+0" label="Personas alcanzadas" />
      <Stat value="0" label="Territorios" />
    </div>
  );
}

function RightColumn() {
  return (
    <div className="theme-public bg-background flex grow flex-col place-content-center gap-4.5 pt-8 pr-6 pb-8 pl-6 lg:gap-12 lg:p-18">
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
      <Image src={loginImage} className="hidden aspect-auto w-150 lg:flex" alt="Red de Impacto" />
      <ErrorBoundary fallback={<StatsFallback />}>
        <Suspense fallback={<StatsFallback />}>
          <Stats />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function LeftColumn({
  sessionExpired,
  passwordChanged,
}: {
  sessionExpired: boolean;
  passwordChanged: boolean;
}) {
  return (
    <div className="bg-background flex flex-col justify-between gap-6 pt-10 pr-6 pb-8 pl-6 lg:w-140 lg:min-w-140 lg:gap-0 lg:pt-14 lg:pr-18 lg:pb-10 lg:pl-18 2xl:min-w-[33%]">
      <div className="flex h-11 flex-row gap-2.5 lg:gap-3">
        <Image src={icon} className="h-11 basis-11 rounded-xl" alt="Logo" />
        <div className="flex flex-col gap-1">
          <p className="text-primary text-base leading-6 font-semibold tracking-normal">
            Gurises Unidos
          </p>
          <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
            ONG Uruguay
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 lg:gap-2">
          <p className="text-primary text-3xl leading-9 font-bold tracking-normal">Bienvenido</p>
          <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
            Ingresá con tu cuenta para acceder al panel de gestión institucional.
          </p>
        </div>
        {passwordChanged ? (
          <p className="text-status-success text-sm leading-5 font-medium tracking-normal">
            Tu contraseña se actualizó correctamente. Iniciá sesión con la nueva contraseña.
          </p>
        ) : null}
        <LoginForm sessionExpired={sessionExpired} />
      </div>
      <footer className="hidden flex-col gap-2 lg:flex">
        <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
          Plataforma interna de gestión de Gurises Unidos.
        </p>
        <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
          Versión v{version}
        </p>
      </footer>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[]; passwordChanged?: string }>;
}) {
  const { reason, passwordChanged } = await searchParams;

  return (
    <div className="flex min-h-screen w-full flex-col font-sans lg:h-screen lg:flex-row">
      <LeftColumn
        sessionExpired={reason === SESSION_EXPIRATION_REASON}
        passwordChanged={passwordChanged === '1'}
      />
      <RightColumn />
      <footer className="bg-background flex flex-col gap-0.5 p-6 pt-5 lg:hidden">
        <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
          Plataforma interna de gestión de Gurises Unidos.
        </p>
        <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
          Versión v{version}
        </p>
      </footer>
    </div>
  );
}
