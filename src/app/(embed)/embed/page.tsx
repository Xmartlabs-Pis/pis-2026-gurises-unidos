import { connection } from 'next/server';
import { getMetricSettings, getMetricValues, getPublishedYears } from '@/lib/metrics/queries';
import { getPublicStats } from '@/lib/metrics/public-stats';
import { Button } from '@/components/ui/button';

const SINGLE_ROW_MAX = 4;

const DESKTOP_COLUMNS_CLASSES: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

function getDesktopLayout(count: number) {
  if (count <= SINGLE_ROW_MAX) {
    return {
      columns: DESKTOP_COLUMNS_CLASSES[Math.max(count, 1)],
      divider: 'md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-6',
    };
  }
  return {
    columns: DESKTOP_COLUMNS_CLASSES[3],
    divider: 'md:[&:not(:nth-child(3n+1))]:border-l md:[&:not(:nth-child(3n+1))]:pl-6',
  };
}

export default async function EmbedPage() {
  await connection();
  const [year] = await getPublishedYears();
  const [values, settings] = await Promise.all([getMetricValues(year), getMetricSettings()]);
  const stats = getPublicStats(settings, values);
  const layout = getDesktopLayout(stats.length);

  return (
    <div className="bg-background mx-auto flex h-fit w-full max-w-300 flex-col gap-6 rounded-[12px] p-6 md:gap-7 md:rounded-[16px] md:p-10">
      <p className="text-lg leading-7 font-semibold md:text-xl">Nuestro impacto en {year}</p>
      <div
        role="group"
        aria-label={`Impacto ${year}`}
        className={`grid grid-cols-2 gap-5 md:gap-7 ${layout.columns}`}
      >
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={`border-muted-foreground flex flex-col gap-1 pr-3 max-md:last:odd:col-span-2 max-md:even:border-l max-md:even:pl-3 md:pr-6 ${layout.divider}`}
          >
            <span className="text-primary text-3xl leading-9 font-bold md:text-4xl md:leading-10 md:font-black">
              {stat.value}
            </span>
            <span className="text-sm leading-5 font-normal">{stat.description}</span>
          </div>
        ))}
      </div>
      <Button
        nativeButton={false}
        render={<a href="/" target="_blank" rel="noopener noreferrer" />}
        className="flex h-9 w-full gap-2.5 rounded-lg bg-white px-4 py-2 md:w-fit"
      >
        Ver informe completo
      </Button>
    </div>
  );
}
