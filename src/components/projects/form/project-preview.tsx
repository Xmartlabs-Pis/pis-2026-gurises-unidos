'use client';

import Image from 'next/image';
import { cn } from 'cn';
import { Card } from '@/components/ui/card';
import type { ProjectFormValues } from './project-form-values';

export function ProjectPreview({
  values,
  locationLabel,
  beneficiaryTotal,
}: {
  values: ProjectFormValues;
  locationLabel: string;
  beneficiaryTotal: number;
}) {
  return (
    <aside
      aria-label="Vista previa de la tarjeta pública"
      className="bg-muted/30 min-w-0 lg:sticky lg:top-2"
    >
      <div className="bg-surface-page flex min-h-12 flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <p className="text-muted-foreground text-xs leading-4">
          Vista previa de la tarjeta pública
        </p>
        <p className="text-muted-foreground text-xs leading-4">Actualización automática</p>
      </div>

      <div className="bg-muted flex flex-col items-center gap-3 px-6 py-8">
        <Card className="theme-public bg-card text-card-foreground w-full max-w-[377px] gap-0 overflow-hidden rounded-xl border-0 py-0 shadow-none ring-0">
          <div
            className={cn(
              'relative aspect-video w-full overflow-hidden',
              values.coverPhotoUrl
                ? values.coverPhotoUrl.startsWith('blob:') && 'bg-cover bg-center'
                : 'bg-project-cover'
            )}
            style={
              values.coverPhotoUrl?.startsWith('blob:')
                ? { backgroundImage: `url("${values.coverPhotoUrl}")` }
                : undefined
            }
          >
            {values.coverPhotoUrl && !values.coverPhotoUrl.startsWith('blob:') && (
              <Image src={values.coverPhotoUrl} alt="" fill className="object-cover" />
            )}
          </div>

          <div className="flex flex-col gap-3 p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs leading-4">
              <span aria-hidden="true" className="bg-primary size-1.5 shrink-0 rounded-full" />
              <span className="min-w-0 wrap-anywhere">{locationLabel}</span>
            </div>

            <h3 className="text-lg leading-7 font-semibold break-words">
              {values.name || 'Nombre del proyecto'}
            </h3>

            <p className="text-muted-foreground text-sm leading-5 break-words">
              {values.generalObjective || 'El objetivo general aparecerá aquí cuando lo completes.'}
            </p>

            <div className="flex flex-wrap items-baseline gap-2 pt-1">
              <span className="text-primary text-2xl leading-8 font-bold">
                {beneficiaryTotal.toLocaleString('es-UY')}
              </span>
              <span className="text-muted-foreground text-xs leading-4">personas alcanzadas</span>
            </div>
          </div>
        </Card>
        <p className="text-muted-foreground text-center text-xs leading-4">
          Así se verá en el listado público
        </p>
      </div>
    </aside>
  );
}
