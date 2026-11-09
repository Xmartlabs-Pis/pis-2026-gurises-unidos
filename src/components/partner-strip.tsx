'use client';

import { useRef, useState, type PointerEvent } from 'react';
import type { PublicPartner } from '@/lib/partners';

export function PartnerStrip({ partners }: { partners: PublicPartner[] }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    if (
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      element.scrollWidth <= element.clientWidth
    )
      return;
    event.preventDefault();
    element.focus({ preventScroll: true });
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: element.scrollLeft,
    };
    element.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      role="group"
      aria-label="Colaboradores"
      tabIndex={0}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      className={`partner-strip focus-visible:outline-foreground w-full max-w-260 [scrollbar-width:none] overflow-x-auto overscroll-x-contain py-1 select-none focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-scrollbar]:hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <ul className="flex w-max min-w-full justify-center gap-3 px-8">
        {partners.map((partner) => (
          <li
            key={partner.id}
            className="bg-card text-foreground flex min-h-10 shrink-0 items-center justify-center rounded-full px-5 py-2 text-sm leading-5 font-medium whitespace-nowrap"
          >
            {partner.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
