'use client';

import type { ReactNode } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MetricsPartner } from '@/lib/partners';

const GRIP_BUTTON_CLASS_NAME =
  'focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-full hover:bg-current/15 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing disabled:cursor-default disabled:opacity-50';

function getPartnerPillClassName(showPublicly: boolean) {
  const colors = showPublicly
    ? 'bg-surface-brand-deep text-white'
    : 'bg-muted text-muted-foreground';
  return `flex max-w-full min-w-0 items-center gap-2 rounded-full py-1.5 pr-1.5 pl-1.5 text-sm ${colors}`;
}

function VisibilityButton({
  partner,
  disabled,
  onToggle,
}: {
  partner: MetricsPartner;
  disabled: boolean;
  onToggle: () => void;
}) {
  const VisibilityIcon = partner.showPublicly ? Eye : EyeOff;

  return (
    <button
      type="button"
      aria-label={`Mostrar ${partner.name} en el sitio público`}
      aria-pressed={partner.showPublicly}
      title={partner.showPublicly ? 'Visible en el sitio público' : 'Oculto en el sitio público'}
      disabled={disabled}
      className="focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-current/15 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      onClick={onToggle}
    >
      <VisibilityIcon className="size-4" aria-hidden="true" />
    </button>
  );
}

export function PartnerDropZone({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 rounded-xl border border-dashed p-3 transition-colors ${
        isOver ? 'border-primary bg-muted/50' : 'border-border-default'
      }`}
    >
      {children}
    </div>
  );
}

export function SortablePartner({
  partner,
  disabled,
  reorderDisabled,
  onToggleVisibility,
  onMove,
}: {
  partner: MetricsPartner;
  disabled: boolean;
  reorderDisabled: boolean;
  onToggleVisibility: () => void;
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
    id: partner.id,
    disabled: reorderDisabled,
  });

  return (
    <li
      ref={setNodeRef}
      data-partner-id={partner.id}
      className={getPartnerPillClassName(partner.showPublicly)}
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
        aria-label={`Reordenar ${partner.name}`}
        aria-describedby="partners-order-description"
        disabled={reorderDisabled}
        className={GRIP_BUTTON_CLASS_NAME}
        onKeyDown={(event) => {
          const direction = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
          if (!direction || reorderDisabled || isDragging) return;
          event.preventDefault();
          onMove(direction);
        }}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <span className="truncate" title={partner.name}>
        {partner.name}
      </span>
      <VisibilityButton
        partner={partner}
        disabled={disabled || isDragging}
        onToggle={onToggleVisibility}
      />
    </li>
  );
}

export function HiddenPartner({
  partner,
  disabled,
  dragDisabled,
  onToggleVisibility,
}: {
  partner: MetricsPartner;
  disabled: boolean;
  dragDisabled: boolean;
  onToggleVisibility: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: partner.id,
    disabled: dragDisabled,
  });

  return (
    <li
      ref={setNodeRef}
      className={getPartnerPillClassName(partner.showPublicly)}
      style={{ opacity: isDragging ? 0.2 : undefined }}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        aria-label={`Arrastrar ${partner.name}`}
        disabled={dragDisabled}
        className={GRIP_BUTTON_CLASS_NAME}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <span className="truncate" title={partner.name}>
        {partner.name}
      </span>
      <VisibilityButton
        partner={partner}
        disabled={disabled || isDragging}
        onToggle={onToggleVisibility}
      />
    </li>
  );
}

export function PartnerDragPreview({ partner }: { partner: MetricsPartner }) {
  const VisibilityIcon = partner.showPublicly ? Eye : EyeOff;

  return (
    <div
      aria-hidden="true"
      className={`${getPartnerPillClassName(partner.showPublicly)} cursor-grabbing shadow-xl`}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center">
        <GripVertical className="size-4" />
      </span>
      <span className="truncate">{partner.name}</span>
      <span className="inline-flex size-8 shrink-0 items-center justify-center">
        <VisibilityIcon className="size-4" />
      </span>
    </div>
  );
}
