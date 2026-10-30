import { formatNumber } from '@/lib/format';
import type { ProjectDetail } from '@/lib/projects/detail';

const PERCENTAGE_FORMATTER = new Intl.NumberFormat('es-UY', {
  maximumFractionDigits: 1,
});

function ContributionItem({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="border-border lg:bg-surface-highlight flex flex-col border-b py-4 last:border-b-0 lg:rounded-lg lg:border-0 lg:px-4 lg:py-3.5">
      <dt className="text-muted-foreground order-2 mt-0.5 text-sm lg:text-xs">{label}</dt>
      <dd className="order-1 text-2xl leading-8 font-bold tracking-tight tabular-nums">{value}</dd>
      <p className="text-muted-foreground order-3 mt-0.5 text-xs leading-4">{detail}</p>
    </div>
  );
}

export function InstitutionalContribution({
  data,
}: {
  data: ProjectDetail['institutionalContribution'];
}) {
  const reach =
    data.nationalReach.percentage === null
      ? '—'
      : `${PERCENTAGE_FORMATTER.format(data.nationalReach.percentage)}%`;

  return (
    <section className="border-border bg-card h-full rounded-[14px] border p-4 sm:p-5">
      <h2 className="text-base font-semibold sm:text-sm">Contribución institucional</h2>
      <p className="text-muted-foreground mt-4 max-w-sm text-xs leading-4">
        Peso relativo en el alcance global de Gurises Unidos
      </p>

      <dl className="mt-1 grid lg:gap-3">
        <ContributionItem
          value={reach}
          label="del alcance nacional"
          detail={`${data.nationalReach.projectValue === null ? '—' : formatNumber(data.nationalReach.projectValue)} de ${formatNumber(data.nationalReach.nationalValue)} NNA totales`}
        />
        <ContributionItem
          value={`${formatNumber(data.activeProjects.projectCount)}/${formatNumber(data.activeProjects.totalCount)}`}
          label="proyectos activos"
          detail={
            data.activeProjects.projectCount === 1
              ? 'Este proyecto está activo'
              : 'Este proyecto no está activo'
          }
        />
        <ContributionItem
          value={formatNumber(data.territories.count)}
          label={data.territories.count === 1 ? 'territorio vinculado' : 'territorios vinculados'}
          detail={data.territories.items.join(' · ')}
        />
      </dl>
    </section>
  );
}
