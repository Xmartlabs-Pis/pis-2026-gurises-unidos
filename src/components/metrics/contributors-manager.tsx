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
  createContributorSortingStrategy,
  type ContributorSortingStrategy,
} from '@/components/metrics/contributor-sorting';
import {
  SortableContributor,
  ContributorDragPreview,
} from '@/components/metrics/sortable-contributor';
import { Plus } from 'lucide-react';
import {
  createContributor,
  deleteContributor,
  reorderContributors,
} from '@/app/actions/contributors';
import type { Contributor } from '@/lib/contributors';
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

export function ContributorsManager({ contributors }: { contributors: Contributor[] }) {
  const [name, setName] = useState('');
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [orderedContributors, setOrderedContributors] = useState<Contributor[] | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sortingStrategyRef = useRef<ContributorSortingStrategy | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number>();
  const sortingStrategy = useCallback<SortingStrategy>(
    (args) => sortingStrategyRef.current?.(args) ?? null,
    []
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const displayedContributors = orderedContributors ?? contributors;

  function saveOrder(nextContributors: Contributor[]) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await reorderContributors(nextContributors.map(({ id }) => id));
        if (!result.success) setError(result.message);
        else notify.success({ title: result.message });
      } catch {
        setError('No se pudo guardar el orden. Intentá de nuevo.');
      } finally {
        setOrderedContributors(null);
      }
    });
  }

  function moveContributor(id: number, targetIndex: number) {
    const next = [...displayedContributors];
    const sourceIndex = next.findIndex((item) => item.id === id);
    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= next.length ||
      sourceIndex === targetIndex
    )
      return null;
    const [contributor] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, contributor);
    setOrderedContributors(next);
    return next;
  }

  function addContributor() {
    if (isPending || !name.trim()) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await createContributor(name);
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

  function removeContributor() {
    if (!selectedContributor || isPending) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await deleteContributor(selectedContributor.id);
        if (!result.success) {
          setError(result.message);
          return;
        }
        setSelectedContributor(null);
        notify.success({ title: result.message });
      } catch {
        setError('No se pudo eliminar el contribuyente. Intentá de nuevo.');
      }
    });
  }

  return (
    <section
      aria-labelledby="contributors-heading"
      className="bg-card border-border-default flex flex-col gap-4 rounded-[14px] border p-5"
    >
      <div className="flex flex-col gap-2">
        <h2 id="contributors-heading" className="text-lg font-semibold">
          Quienes nos acompañan
        </h2>
        <p id="contributors-description" className="text-muted-foreground text-sm">
          Agregá un contribuyente con el botón + o presioná Enter para publicarlo de inmediato. Los
          contribuyentes se muestran en todos los años del sitio público.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="contributor-name" className="text-sm font-medium">
          Nombre del contribuyente
        </label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="contributor-name"
            value={name}
            maxLength={100}
            disabled={isPending}
            className="h-9 min-w-0 flex-1"
            placeholder="Ej: INAU"
            aria-describedby="contributors-description"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                addContributor();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            disabled={isPending || !name.trim()}
            onClick={addContributor}
            aria-label="Agregar contribuyente"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error && !selectedContributor && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {contributors.length ? (
        <>
          <p id="contributors-order-description" className="text-muted-foreground text-sm">
            Arrastrá desde el ícono de cada píldora para cambiar su orden en el sitio público.
            También podés usar las flechas del teclado al enfocar el ícono.
          </p>
          <DndContext
            id="contributors-sortable"
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
              sortingStrategyRef.current = createContributorSortingStrategy({
                left,
                top,
                width,
                gap,
              });
              setDraggedId(Number(active.id));
            }}
            onDragOver={({ active, over }) => {
              if (!over) return;
              const sourceIndex = displayedContributors.findIndex(({ id }) => id === active.id);
              const targetIndex = displayedContributors.findIndex(({ id }) => id === over.id);
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
              const sourceIndex = displayedContributors.findIndex(({ id }) => id === active.id);
              const targetIndex = displayedContributors.findIndex(({ id }) => id === over.id);
              if (sourceIndex < 0 || targetIndex < 0) return;
              const next = arrayMove(displayedContributors, sourceIndex, targetIndex);
              setOrderedContributors(next);
              saveOrder(next);
            }}
          >
            <SortableContext items={displayedContributors} strategy={sortingStrategy}>
              <ul
                ref={listRef}
                style={{ minHeight: previewHeight }}
                aria-label="Contribuyentes publicados"
                className="flex min-w-0 flex-wrap content-start gap-3"
              >
                {displayedContributors.map((contributor, index) => (
                  <SortableContributor
                    key={contributor.id}
                    contributor={contributor}
                    disabled={isPending || draggedId !== null}
                    reorderDisabled={isPending || contributors.length < 2}
                    onDelete={() => {
                      setError(undefined);
                      setSelectedContributor(contributor);
                    }}
                    onMove={(direction) => {
                      if (draggedId !== null) return;
                      const next = moveContributor(contributor.id, index + direction);
                      if (next) saveOrder(next);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
            <DragOverlay adjustScale={false}>
              {draggedId !== null && displayedContributors.find(({ id }) => id === draggedId) && (
                <ContributorDragPreview
                  contributor={displayedContributors.find(({ id }) => id === draggedId)!}
                />
              )}
            </DragOverlay>
          </DndContext>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No hay contribuyentes publicados.</p>
      )}
      <AlertDialog
        open={!!selectedContributor}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setSelectedContributor(null);
            setError(undefined);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {selectedContributor?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en el sitio público. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={removeContributor}>
              {isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
