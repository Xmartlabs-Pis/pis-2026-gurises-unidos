import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatNumber } from '@/lib/format';
import { INTENSITY_LABEL, STATUS_LABEL } from '@/lib/project-display';
import { STATUS_BADGE_VARIANT } from '@/lib/projects/constants';
import type { ProjectListItem } from '@/lib/projects/list';

type InternalProjectCardProps = {
  variant?: 'internal';
  id: number;
  name: string;
  status: ProjectListItem['status'];
  territory: ProjectListItem['department'];
  coordinator: string;
  intensity: ProjectListItem['intensity'];
  year: number;
  totalReach: number | null;
};

type PublicProjectCardProps = {
  variant: 'public-dark';
  territory: string;
  name: string;
  description: string;
  coverPhoto: string | null;
  reach: number;
};

export type ProjectCardProps = InternalProjectCardProps | PublicProjectCardProps;

const PUBLIC_VARIANT_STYLES = {
  'public-dark': {
    card: 'bg-card border-primary',
    image: 'bg-status-success/25',
    dot: 'bg-primary',
    territory: 'text-foreground',
    name: 'text-foreground',
    description: 'text-muted-foreground',
    reach: 'text-primary',
    reachLabel: 'text-muted-foreground',
  },
};

function isPublicProps(props: ProjectCardProps): props is PublicProjectCardProps {
  return props.variant === 'public-dark';
}

export function ProjectCard(props: ProjectCardProps) {
  if (isPublicProps(props)) {
    return <PublicProjectCard {...props} />;
  }
  return <InternalProjectCard {...props} />;
}

function PublicProjectCard({
  variant,
  territory,
  name,
  description,
  coverPhoto,
  reach,
}: PublicProjectCardProps) {
  const styles = PUBLIC_VARIANT_STYLES[variant];

  return (
    <article className={`${styles.card} flex h-full flex-col overflow-hidden rounded-xl`}>
      <div className={`${styles.image} relative h-54.5 w-full`}>
        {coverPhoto && (
          <Image
            src={coverPhoto}
            alt={`Portada de ${name}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`${styles.dot} size-1.5 rounded-full`} />
          <span className={`${styles.territory} text-xs leading-4 font-normal tracking-normal`}>
            {territory}
          </span>
        </div>
        <h3 className={`${styles.name} text-base leading-6 font-medium tracking-normal`}>{name}</h3>
        {description && (
          <p className={`${styles.description} text-sm leading-5 font-normal tracking-normal`}>
            {description}
          </p>
        )}
        <div className="mt-auto flex items-baseline gap-2">
          <span className={`${styles.reach} text-xl leading-7 font-bold tracking-normal`}>
            {formatNumber(reach)}
          </span>
          <span className={`${styles.reachLabel} text-xs leading-4 font-normal tracking-normal`}>
            personas alcanzadas
          </span>
        </div>
      </div>
    </article>
  );
}

function InternalProjectCard({
  id,
  name,
  status,
  territory,
  coordinator,
  intensity,
  year,
  totalReach,
}: InternalProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${id}`} className="block h-full">
      <Card className="bg-card flex h-full flex-col gap-3.5 rounded-lg px-5 py-4.5 hover:shadow-sm/10">
        <CardHeader className="text-primary flex flex-row justify-between gap-3 p-0! text-base font-semibold">
          <h2 className="line-clamp-2 min-w-0" title={name}>
            {name}
          </h2>
          <Badge
            variant={STATUS_BADGE_VARIANT[status]}
            className="h-5.5 shrink-0 gap-2.5 rounded-lg px-5.5 py-0.5 text-xs leading-4 font-medium tracking-normal"
          >
            {STATUS_LABEL[status]}
          </Badge>
        </CardHeader>
        <div className="flex flex-col gap-1.5">
          <CardDescription className="flex flex-row justify-between">
            <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
              Territorio
            </p>
            <p className="text-foreground text-xs leading-4 font-medium tracking-normal">
              {territory.name}
            </p>
          </CardDescription>
          <CardDescription className="flex flex-row justify-between">
            <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
              Coordinador/a
            </p>
            <p className="text-foreground text-xs leading-4 font-medium tracking-normal">
              {coordinator}
            </p>
          </CardDescription>
          <CardDescription className="flex flex-row justify-between">
            <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
              Intensidad
            </p>
            <p className="text-foreground text-xs leading-4 font-medium tracking-normal">
              {INTENSITY_LABEL[intensity]}
            </p>
          </CardDescription>
        </div>
        <Separator className="mt-auto" />
        <CardDescription className="flex flex-row items-center justify-between">
          <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
            {totalReach !== null ? `Beneficiarios ${year}` : 'Sin beneficiarios'}
          </p>
          <p className="text-primary text-xl leading-7 font-bold tracking-normal">
            {totalReach !== null ? formatNumber(totalReach) : '—'}
          </p>
        </CardDescription>
      </Card>
    </Link>
  );
}
