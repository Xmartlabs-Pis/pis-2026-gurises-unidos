'use client';

import { GripVertical, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Contributor } from '@/lib/contributors';

const CONTRIBUTOR_PILL_CLASS_NAME =
  'group bg-surface-brand-deep flex max-w-full min-w-0 items-center gap-2 rounded-full py-1.5 pr-1.5 pl-1.5 text-sm text-white';

export function SortableContributor({
  contributor,
  disabled,
  reorderDisabled,
  onDelete,
  onMove,
}: {
  contributor: Contributor;
  disabled: boolean;
  reorderDisabled: boolean;
  onDelete: () => void;
  onMove: (direction: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: contributor.id,
    disabled: reorderDisabled,
  });

  return (
    <li
      ref={setNodeRef}
      data-contributor-id={contributor.id}
      className={CONTRIBUTOR_PILL_CLASS_NAME}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : undefined,
      }}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        aria-label={`Reordenar ${contributor.name}`}
        aria-describedby="contributors-order-description"
        disabled={reorderDisabled}
        className="focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
        onKeyDown={(event) => {
          const direction = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
          if (!direction || reorderDisabled || isDragging) return;
          event.preventDefault();
          onMove(direction);
        }}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <span className="truncate" title={contributor.name}>
        {contributor.name}
      </span>
      <button
        type="button"
        aria-label={`Eliminar ${contributor.name}`}
        disabled={disabled || isDragging}
        className="focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
        onClick={onDelete}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export function ContributorDragPreview({ contributor }: { contributor: Contributor }) {
  return (
    <div aria-hidden="true" className={`${CONTRIBUTOR_PILL_CLASS_NAME} cursor-grabbing shadow-xl`}>
      <span className="inline-flex size-7 shrink-0 items-center justify-center">
        <GripVertical className="size-4" />
      </span>
      <span className="truncate">{contributor.name}</span>
      <span className="inline-flex size-8 shrink-0 items-center justify-center">
        <X className="size-4" />
      </span>
    </div>
  );
}
