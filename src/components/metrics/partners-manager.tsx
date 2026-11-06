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
import { SortableContext, arrayMove, type SortingStrategy } from '@dnd-kit/sortable';
import {
  createPartnerSortingStrategy,
  type PartnerSortingStrategy,
} from '@/components/metrics/partner-sorting';
import { SortablePartner, PartnerDragPreview } from '@/components/metrics/sortable-partner';
import { Plus } from 'lucide-react';
import { createPartner, deletePartner, reorderPartners } from '@/app/actions/partners';
import type { Partner } from '@/lib/partners';
import { notify } from '@/lib/notify';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PartnersManager({ partners }: { partners: Partner[] }) {
  const [name, setName] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [orderedPartners, setOrderedPartners] = useState<Partner[] | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sortingStrategyRef = useRef<PartnerSortingStrategy | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number>();
  const sortingStrategy = useCallback<SortingStrategy>(
    (args) => sortingStrategyRef.current?.(args) ?? null,
    []
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const displayedPartners = orderedPartners ?? partners;

  function saveOrder(nextPartners: Partner[]) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await reorderPartners(nextPartners.map(({ id }) => id));
        if (!result.success) setError(result.message);
        else notify.success({ title: result.message });
      } catch {
        setError('No se pudo guardar el orden. Intentá de nuevo.');
      } finally {
        setOrderedPartners(null);
      }
    });
  }

  function movePartner(id: number, targetIndex: number) {
    const next = [...displayedPartners];
    const sourceIndex = next.findIndex((item) => item.id === id);
    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= next.length ||
      sourceIndex === targetIndex
    )
      return null;
    const [partner] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, partner);
    setOrderedPartners(next);
    return next;
  }

  function addPartner() {
    if (isPending || !name.trim()) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await createPartner(name);
        if (!result.success) {
          setError(result.message);
          return;
        }
        setName('');
        notify.success({ title: result.message });
      } catch {
        setError('No se pudo agregar el contribuyente. Intentá de nuevo.');
      }
    });
  }

  function removePartner() {
    if (!selectedPartner || isPending) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await deletePartner(selectedPartner.id);
        if (!result.success) {
          setError(result.message);
          return;
        }
        setSelectedPartner(null);
        notify.success({ title: result.message });
      } catch {
        setError('No se pudo eliminar el contribuyente. Intentá de nuevo.');
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
          Agregá un contribuyente con el botón + o presioná Enter para publicarlo de inmediato. Los
          contribuyentes se muestran en todos los años del reporte público.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="partner-name" className="text-sm font-medium">
          Nombre del contribuyente
        </label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="partner-name"
            value={name}
            maxLength={100}
            disabled={isPending}
            className="h-9 min-w-0 flex-1"
            placeholder="Ej: INAU"
            aria-describedby="partners-description"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                addPartner();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            disabled={isPending || !name.trim()}
            onClick={addPartner}
            aria-label="Agregar contribuyente"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error && !selectedPartner && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {partners.length ? (
        <>
          <p id="partners-order-description" className="text-muted-foreground text-sm">
            Arrastrá desde el ícono de cada píldora para cambiar su orden en el reporte público.
            También podés usar las flechas del teclado al enfocar el ícono.
          </p>
          <DndContext
            id="partners-sortable"
            sensors={sensors}
            collisionDetection={(args) => {
              const collisions = pointerWithin(args);
              return collisions.length ? collisions : closestCenter(args);
            }}
            onDragStart={({ active }) => {
              const list = listRef.current;
              if (!list) return;
              const { left, top, width } = list.getBoundingClientRect();
              const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
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
              const sourceIndex = displayedPartners.findIndex(({ id }) => id === active.id);
              const targetIndex = displayedPartners.findIndex(({ id }) => id === over.id);
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
              const sourceIndex = displayedPartners.findIndex(({ id }) => id === active.id);
              const targetIndex = displayedPartners.findIndex(({ id }) => id === over.id);
              if (sourceIndex < 0 || targetIndex < 0) return;
              const next = arrayMove(displayedPartners, sourceIndex, targetIndex);
              setOrderedPartners(next);
              saveOrder(next);
            }}
          >
            <SortableContext items={displayedPartners} strategy={sortingStrategy}>
              <ul
                ref={listRef}
                style={{ minHeight: previewHeight }}
                aria-label="Contribuyentes publicados"
                className="flex min-w-0 flex-wrap content-start gap-3"
              >
                {displayedPartners.map((partner, index) => (
                  <SortablePartner
                    key={partner.id}
                    partner={partner}
                    disabled={isPending || draggedId !== null}
                    reorderDisabled={isPending || partners.length < 2}
                    onDelete={() => {
                      setError(undefined);
                      setSelectedPartner(partner);
                    }}
                    onMove={(direction) => {
                      if (draggedId !== null) return;
                      const next = movePartner(partner.id, index + direction);
                      if (next) saveOrder(next);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
            <DragOverlay adjustScale={false}>
              {draggedId !== null && displayedPartners.find(({ id }) => id === draggedId) && (
                <PartnerDragPreview
                  partner={displayedPartners.find(({ id }) => id === draggedId)!}
                />
              )}
            </DragOverlay>
          </DndContext>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No hay contribuyentes publicados.</p>
      )}
      <AlertDialog
        open={!!selectedPartner}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setSelectedPartner(null);
            setError(undefined);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {selectedPartner?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en el reporte público. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={removePartner}>
              {isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
