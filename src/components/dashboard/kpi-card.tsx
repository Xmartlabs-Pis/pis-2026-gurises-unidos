import { cn } from 'cn';
import { formatNumber } from '@/lib/format';
import type { DashboardKpi } from '@/lib/dashboard/queries';

export function KpiCard({ kpi, className }: { kpi: DashboardKpi; className?: string }) {
  return (
    <div
      className={cn('bg-card border-border min-w-0 rounded-[14px] border p-4 sm:p-6', className)}
    >
      <p className="text-foreground text-2xl font-bold break-words sm:text-3xl">
        {formatNumber(kpi.value)}
      </p>
      <p className="text-foreground mt-1 text-sm font-medium">{kpi.label}</p>
      <p className="text-muted-foreground mt-1 text-sm">{kpi.delta}</p>
    </div>
  );
}
