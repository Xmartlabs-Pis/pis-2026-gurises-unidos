import { formatNumber } from '@/lib/format';
import type { DashboardKpi } from '@/lib/dashboard/queries';

export function HeroKpiCard({ kpi }: { kpi: DashboardKpi }) {
  return (
    <div className="bg-card border-border rounded-[14px] border p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-foreground text-3xl font-bold break-words sm:text-4xl">
            {formatNumber(kpi.value)}
          </p>
          <p className="text-muted-foreground text-sm">{kpi.label}</p>
        </div>
        <p className="text-muted-foreground text-sm sm:shrink-0">{kpi.delta}</p>
      </div>
    </div>
  );
}
