'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, type SortingStrategy } from '@dnd-kit/sortable';
import {
  HIDDEN_ZONE_ID,
  VISIBLE_ZONE_ID,
  createPartnerSortingStrategy,
  getPartnerPlacement,
  type PartnerSortingStrategy,
} from '@/components/metrics/partner-sorting';
import {
  HiddenPartner,
  PartnerDragPreview,
  PartnerDropZone,
  SortablePartner,
} from '@/components/metrics/sortable-partner';
import { placePartner, reorderPartners, setPartnerVisibility } from '@/app/actions/partners';
import type { MetricsPartner } from '@/lib/partners';
import { notify } from '@/lib/notify';

export function PartnersManager({ partners }: { partners: MetricsPartner[] }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [optimisticPartners, setOptimisticPartners] = useState<MetricsPartner[] | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sortingStrategyRef = useRef<PartnerSortingStrategy | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number>();
  const sortingStrategy = useCallback<SortingStrategy>(
    (args) => sortingStrategyRef.current?.(args) ?? null,
    []
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const displayedPartners = optimisticPartners ?? partners;
  const visiblePartners = displayedPartners.filter((partner) => partner.showPublicly);
  const hiddenPartners = displayedPartners.filter((partner) => !partner.showPublicly);
  const draggedPartner = displayedPartners.find(({ id }) => id === draggedId);

  function savePartners(
    nextPartners: MetricsPartner[],
    save: (order: number[]) => Promise<{ success: boolean; message: string }>
  ) {
    setError(undefined);
    setOptimisticPartners(nextPartners);
    startTransition(async () => {
      try {
        const result = await save(nextPartners.map(({ id }) => id));
        if (!result.success) setError(result.message);
        else notify.success({ title: result.message });
      } catch {
        setError('No se pudo guardar el orden. Intentá de nuevo.');
      } finally {
        setOptimisticPartners(null);
      }
    });
  }

  function moveWithKeyboard(id: number, targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= visiblePartners.length) return;
    const placement = getPartnerPlacement(
      visiblePartners,
      hiddenPartners,
      id,
      visiblePartners[targetIndex].id
    );
    if (placement) savePartners([...placement.visible, ...placement.hidden], reorderPartners);
  }

  function dropPartner(activeId: number, overId: number | string) {
    const placement = getPartnerPlacement(visiblePartners, hiddenPartners, activeId, overId);
    if (!placement) return;
    const nextPartners = [...placement.visible, ...placement.hidden];
    if (!placement.visibilityChanged) {
      savePartners(nextPartners, reorderPartners);
      return;
    }
    const showPublicly = placement.visible.some(({ id }) => id === activeId);
    savePartners(nextPartners, (order) => placePartner({ id: activeId, showPublicly, order }));
  }

  function toggleVisibility(partner: MetricsPartner) {
    if (isPending) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await setPartnerVisibility(partner.id, !partner.showPublicly);
        if (!result.success) setError(result.message);
        else notify.success({ title: result.message });
      } catch {
        setError('No se pudo actualizar la visibilidad. Intentá de nuevo.');
      }
    });
  }

  return (
    <section
      aria-labelledby="partners-heading"
      className="bg-card border-border-default flex flex-col gap-4 rounded-[14px] border p-5"
    >
      <div className="flex flex-col gap-2">
        <h2 id="partners-heading" className="text-lg font-semibold">
          Quienes nos acompañan
        </h2>
        <p id="partners-description" className="text-muted-foreground text-sm">
          Arrastrá cada socio entre las dos zonas, o hacé clic en el ojo, para mostrarlo u ocultarlo
          en todos los años del sitio público. Los socios se crean desde la sección Socios.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {partners.length ? (
        <>
          <p id="partners-order-description" className="text-muted-foreground text-sm">
            Arrastrá desde el ícono de cada píldora para cambiar su orden en el sitio público.
            También podés usar las flechas del teclado al enfocar el ícono.
          </p>
          <DndContext
            id="partners-sortable"
            sensors={sensors}
            collisionDetection={(args) => {
              const collisions = pointerWithin(args);
              const pills = collisions.filter(({ id }) => typeof id === 'number');
              if (pills.length) return pills;
              return collisions.length ? collisions : closestCenter(args);
            }}
            onDragStart={({ active }) => {
              const list = listRef.current;
              if (!list) return;
              const { left, top, width } = list.getBoundingClientRect();
              const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
              sortingStrategyRef.current = createPartnerSortingStrategy({
                left,
                top,
                width,
                gap,
              });
              setDraggedId(Number(active.id));
            }}
            onDragOver={({ active, over }) => {
              if (!over) return;
              const sourceIndex = visiblePartners.findIndex(({ id }) => id === active.id);
              const targetIndex = visiblePartners.findIndex(({ id }) => id === over.id);
              setPreviewHeight(sortingStrategyRef.current?.getHeight(sourceIndex, targetIndex));
            }}
            onDragCancel={() => {
              setDraggedId(null);
              setPreviewHeight(undefined);
            }}
            onDragEnd={({ active, over }) => {
              setDraggedId(null);
              setPreviewHeight(undefined);
              if (!over || active.id === over.id) return;
              dropPartner(Number(active.id), over.id);
            }}
          >
            <h3 className="text-sm font-medium">Visibles en el sitio público</h3>
            <PartnerDropZone id={VISIBLE_ZONE_ID}>
              {visiblePartners.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Arrastrá un socio acá para mostrarlo.
                </p>
              )}
              <SortableContext items={visiblePartners} strategy={sortingStrategy}>
                <ul
                  ref={listRef}
                  style={{ minHeight: previewHeight }}
                  aria-label="Socios visibles"
                  className="flex min-w-0 flex-wrap content-start gap-3"
                >
                  {visiblePartners.map((partner, index) => (
                    <SortablePartner
                      key={partner.id}
                      partner={partner}
                      disabled={isPending || draggedId !== null}
                      reorderDisabled={isPending}
                      onToggleVisibility={() => toggleVisibility(partner)}
                      onMove={(direction) => {
                        if (draggedId !== null) return;
                        moveWithKeyboard(partner.id, index + direction);
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </PartnerDropZone>
            <h3 className="text-sm font-medium">Ocultos en el sitio público</h3>
            <PartnerDropZone id={HIDDEN_ZONE_ID}>
              {hiddenPartners.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Arrastrá un socio acá para ocultarlo.
                </p>
              )}
              <ul aria-label="Socios ocultos" className="flex min-w-0 flex-wrap gap-3">
                {hiddenPartners.map((partner) => (
                  <HiddenPartner
                    key={partner.id}
                    partner={partner}
                    disabled={isPending || draggedId !== null}
                    dragDisabled={isPending}
                    onToggleVisibility={() => toggleVisibility(partner)}
                  />
                ))}
              </ul>
            </PartnerDropZone>
            <DragOverlay adjustScale={false}>
              {draggedPartner && <PartnerDragPreview partner={draggedPartner} />}
            </DragOverlay>
          </DndContext>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No hay socios cargados.</p>
      )}
    </section>
  );
}
