'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveMetricSettings } from '@/app/actions/metrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/format';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import type { MetricSetting, MetricValues } from '@/lib/metrics/queries';
import { notify } from '@/lib/notify';
import type { TopicStatistic } from '@/lib/metrics/topic-statistics';
import { getVisibleTopics } from '@/lib/metrics/visible-topics';

export function MetricsForm({
  year,
  values,
  initialMetrics,
  initialTopics,
}: {
  year: string;
  values: MetricValues;
  initialMetrics: MetricSetting[];
  initialTopics: TopicStatistic[];
}) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [topics, setTopics] = useState(initialTopics);
  const [isPending, startTransition] = useTransition();
  const availableTopics = topics.filter((topic) => topic.projectCount > 0);
  const visibleMetrics = metrics.filter((metric) => metric.showPublicly);
  const visibleTopics = getVisibleTopics(topics);

  function saveChanges() {
    startTransition(async () => {
      try {
        const result = await saveMetricSettings({
          year: Number(year),
          metrics: metrics.map(({ key, showPublicly }) => ({ key, showPublicly })),
          topics: topics.map(({ id, showPublicly }) => ({ id, showPublicly })),
        });
        if (!result.success) {
          notify.error({ title: result.message });
          return;
        }
        notify.success({ title: result.message });
      } catch {
        notify.error({ title: 'No se pudieron guardar los cambios. Intentá de nuevo.' });
      }
    });
  }

  function setVisibility(key: string, showPublicly: boolean) {
    setMetrics((current) =>
      current.map((metric) => (metric.key === key ? { ...metric, showPublicly } : metric))
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-[1185px] items-start gap-y-6 xl:grid-cols-[minmax(0,760fr)_minmax(0,425fr)]">
        <section
          aria-label="Selección de métricas"
          className="bg-surface-page flex min-w-0 flex-col gap-5 px-6 pt-6 pb-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.map((metric) => (
              <article
                key={metric.key}
                className="bg-card border-border-default flex min-w-0 flex-col gap-3 rounded-[14px] border p-5"
              >
                <h2 className="text-lg font-semibold">
                  <label htmlFor={`${metric.key}-value`}>{metric.name}</label>
                </h2>
                <Input
                  id={`${metric.key}-value`}
                  value={values[metric.key]}
                  readOnly
                  aria-describedby={`${metric.key}-description`}
                  className="text-muted-foreground h-10 text-base"
                />
                <p
                  id={`${metric.key}-description`}
                  className="text-muted-foreground flex-1 text-sm leading-relaxed"
                >
                  {metric.description}
                </p>
                <div className="flex items-center gap-3 border-t pt-4">
                  <Switch
                    id={`${metric.key}-visibility`}
                    checked={metric.showPublicly}
                    disabled={isPending}
                    onCheckedChange={(checked) => setVisibility(metric.key, checked)}
                    aria-label={`Mostrar ${metric.name} en el sitio público`}
                  />
                  <label htmlFor={`${metric.key}-visibility`} className="cursor-pointer text-sm">
                    Mostrar en el sitio público
                  </label>
                </div>
              </article>
            ))}
          </div>
          <section aria-labelledby="topic-statistics-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 id="topic-statistics-heading" className="text-lg font-semibold">
                  Proyectos por temática
                </h2>
                <Tooltip>
                  <TooltipTrigger
                    delay={0}
                    aria-label="Información sobre la visibilidad de las temáticas"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-6 shrink-0 translate-y-px items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Info className="size-4" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent className="leading-relaxed">
                    Al guardar los cambios, activar o desactivar una temática mostrará u ocultará su
                    barra y su carrusel en la vista pública. Los proyectos ocultos individualmente
                    siguen contando en la barra. Esta configuración no modifica los proyectos del
                    dashboard.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="topic-statistics-visibility"
                  checked={
                    availableTopics.length > 0 &&
                    availableTopics.every((topic) => topic.showPublicly)
                  }
                  disabled={isPending || availableTopics.length === 0}
                  onCheckedChange={(showPublicly) =>
                    setTopics((current) =>
                      current.map((topic) =>
                        topic.projectCount > 0 ? { ...topic, showPublicly } : topic
                      )
                    )
                  }
                />
                <label htmlFor="topic-statistics-visibility" className="cursor-pointer text-sm">
                  Mostrar todas las temáticas
                </label>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Seleccioná las temáticas que querés mostrar en el sitio público. Se cuentan los
              proyectos con actividad registrada en {year}, incluidos los ocultos en el sitio
              público.
            </p>
            {topics.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay temáticas activas.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-card border-border-default flex items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <label htmlFor={`topic-${topic.id}-visibility`} className="cursor-pointer">
                      <span className="block font-medium">{topic.name}</span>
                      <span className="text-muted-foreground text-sm">
                        {formatNumber(topic.projectCount)}{' '}
                        {topic.projectCount === 1 ? 'proyecto' : 'proyectos'}
                      </span>
                    </label>
                    <Switch
                      id={`topic-${topic.id}-visibility`}
                      checked={topic.showPublicly}
                      disabled={isPending || topic.projectCount === 0}
                      aria-label={`Mostrar proyectos de ${topic.name} en el sitio público`}
                      onCheckedChange={(showPublicly) =>
                        setTopics((current) =>
                          current.map((item) =>
                            item.id === topic.id ? { ...item, showPublicly } : item
                          )
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
        <aside
          aria-label="Vista previa del sitio público"
          className="bg-card border-border-default flex w-full flex-col overflow-hidden border xl:mt-6"
        >
          <div className="bg-surface-page border-border-default flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b px-5 py-3 text-sm">
            <h2 className="font-medium">Vista previa</h2>
            <span className="text-muted-foreground">Actualización automática</span>
          </div>
          <div className="bg-surface-subtle flex w-full flex-col gap-3 px-6 py-8">
            <div
              className="bg-surface-brand-deep flex w-full flex-col gap-3.5 rounded-[14px] p-5"
              aria-live="polite"
              aria-atomic="true"
            >
              <h3 className="text-text-accent w-fit font-sans text-xs leading-4 font-bold tracking-[0.06em] uppercase">
                Impacto {year}
              </h3>
              {visibleMetrics.length > 0 ? (
                <dl className="flex flex-col gap-3.5">
                  {visibleMetrics.map((metric) => (
                    <div key={metric.key} className="flex w-full items-center gap-2.5">
                      <dt className="order-2 text-sm text-white/70">{metric.name}</dt>
                      <dd className="text-text-accent order-1 text-4xl font-bold">
                        {formatNumber(values[metric.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-white/70">
                  No hay indicadores seleccionados para mostrar.
                </p>
              )}
              {visibleTopics.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-white/20 pt-4">
                  <h3 className="text-sm font-medium text-white">Proyectos por temática</h3>
                  <dl className="flex flex-col gap-3">
                    {visibleTopics.map((topic) => (
                      <div key={topic.id} className="flex items-center gap-2.5">
                        <dt className="order-2 text-sm text-white/70">{topic.name}</dt>
                        <dd className="text-text-accent order-1 text-3xl font-bold tabular-nums">
                          {formatNumber(topic.projectCount)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              Estas cifras se actualizan automáticamente en el sitio público.
            </p>
            <div className="text-center">
              <Button render={<Link href="/" />} nativeButton={false} variant="link" size="lg">
                Ver sitio público →
              </Button>
            </div>
          </div>
        </aside>
      </div>
      <footer className="bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
        <Button
          variant="ghost"
          className="h-9 w-fit flex-col gap-2.5 rounded-lg px-4 py-2"
          disabled={isPending}
          onClick={() => {
            setTopics((current) => current.map((topic) => ({ ...topic, showPublicly: true })));
            setMetrics((current) =>
              current.map((metric) => ({
                ...metric,
                showPublicly:
                  METRIC_DEFINITIONS.find((definition) => definition.key === metric.key)
                    ?.showPublicly ?? false,
              }))
            );
          }}
        >
          <span className="flex w-fit items-center gap-2.5 leading-5">Restablecer valores</span>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isPending}
            onClick={saveChanges}
            className="h-9 w-fit flex-col gap-2.5 rounded-lg px-4 py-2 shadow-[0_1px_2px_0_rgb(0_0_0/10%)]"
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
