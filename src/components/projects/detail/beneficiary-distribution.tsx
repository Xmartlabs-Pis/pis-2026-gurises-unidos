import { formatNumber } from '@/lib/format';
import type { ProjectDetail } from '@/lib/projects/detail';
import { isSystemBeneficiaryKey, type SystemBeneficiaryKey } from '@/lib/project-display';

const BENEFICIARY_COLORS: Record<SystemBeneficiaryKey, string> = {
  directChildrenAdolescents: 'bg-beneficiary-children',
  indirectChildrenAdolescents: 'bg-beneficiary-children',
  youth18To29: 'bg-beneficiary-staff',
  families: 'bg-beneficiary-families',
  coordinatedInstitutions: 'bg-beneficiary-institutions',
  communityLeaders: 'bg-beneficiary-families',
  basicServiceStaff: 'bg-beneficiary-staff',
};

export function BeneficiaryDistribution({
  data,
  year,
}: {
  data: ProjectDetail['distribution'];
  year: number;
}) {
  const maximum = Math.max(...data.map(({ value }) => value ?? 0), 1);

  return (
    <section className="border-border bg-card rounded-[14px] border p-4 sm:p-5">
      <h2 className="text-base font-semibold sm:text-sm">Distribución de beneficiarios</h2>
      <p className="text-muted-foreground mt-4 text-xs">Conteo por categoría · {year}</p>

      <ul className="mt-4 space-y-3.5 sm:space-y-4">
        {data.map(({ key, label, value }) => {
          const color = isSystemBeneficiaryKey(key)
            ? BENEFICIARY_COLORS[key]
            : 'bg-beneficiary-custom';

          return (
            <li key={key}>
              <div className="text-muted-foreground flex items-baseline justify-between text-xs">
                <span>{label}</span>
                <span className="text-foreground font-medium tabular-nums">
                  {value === null ? '—' : formatNumber(value)}
                </span>
              </div>
              <div
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={maximum}
                aria-valuenow={value ?? undefined}
                className="bg-muted mt-1.5 hidden h-1.5 overflow-hidden rounded-full sm:block"
              >
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${((value ?? 0) / maximum) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
