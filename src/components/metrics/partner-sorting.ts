import { arrayMove, type SortingStrategy } from '@dnd-kit/sortable';

export type PartnerSortingStrategy = SortingStrategy & {
  getHeight: (activeIndex: number, overIndex: number) => number | undefined;
};

export function createPartnerSortingStrategy({
  left,
  top,
  width,
  gap,
}: {
  left: number;
  top: number;
  width: number;
  gap: number;
}): PartnerSortingStrategy {
  let measuredRects: { left: number; top: number; width: number; height: number }[] | null = null;
  const positionsByTarget = new Map<string, ReturnType<SortingStrategy>[]>();
  const heightsByTarget = new Map<string, number>();
  function getPositions(activeIndex: number, overIndex: number) {
    if (!measuredRects || activeIndex < 0 || overIndex < 0) return null;
    const key = `${activeIndex}:${overIndex}`;
    let positions = positionsByTarget.get(key);
    if (!positions) {
      positions = [];
      const orderedIndices = arrayMove(
        measuredRects.map((_, itemIndex) => itemIndex),
        activeIndex,
        overIndex
      );
      let x = left;
      let y = top;
      let rowHeight = 0;
      for (const itemIndex of orderedIndices) {
        const rect = measuredRects[itemIndex];
        if (x > left && x + rect.width > left + width + 0.5) {
          x = left;
          y += rowHeight + gap;
          rowHeight = 0;
        }
        positions[itemIndex] = { x: x - rect.left, y: y - rect.top, scaleX: 1, scaleY: 1 };
        x += rect.width + gap;
        rowHeight = Math.max(rowHeight, rect.height);
      }
      positionsByTarget.set(key, positions);
      heightsByTarget.set(key, y - top + rowHeight);
    }
    return positions;
  }
  const strategy: SortingStrategy = ({ rects, activeIndex, overIndex, index }) => {
    measuredRects ??= rects.map(({ left, top, width, height }) => ({ left, top, width, height }));
    return getPositions(activeIndex, overIndex)?.[index] ?? null;
  };
  return Object.assign(strategy, {
    getHeight(activeIndex: number, overIndex: number) {
      getPositions(activeIndex, overIndex);
      return heightsByTarget.get(`${activeIndex}:${overIndex}`);
    },
  });
}

export const VISIBLE_ZONE_ID = 'visible-partners';
export const HIDDEN_ZONE_ID = 'hidden-partners';

export function getPartnerPlacement<T extends { id: number; showPublicly: boolean }>(
  visible: T[],
  hidden: T[],
  activeId: number,
  overId: number | string
) {
  const visibleIndex = visible.findIndex(({ id }) => id === activeId);
  const hiddenPartner = hidden.find(({ id }) => id === activeId);

  if (overId === HIDDEN_ZONE_ID) {
    if (visibleIndex < 0) return null;
    return {
      visibilityChanged: true,
      visible: visible.filter(({ id }) => id !== activeId),
      hidden: [...hidden, { ...visible[visibleIndex], showPublicly: false }],
    };
  }

  const targetIndex =
    overId === VISIBLE_ZONE_ID ? visible.length : visible.findIndex(({ id }) => id === overId);
  if (targetIndex < 0) return null;

  if (hiddenPartner) {
    const next = [...visible];
    next.splice(targetIndex, 0, { ...hiddenPartner, showPublicly: true });
    return {
      visibilityChanged: true,
      visible: next,
      hidden: hidden.filter(({ id }) => id !== activeId),
    };
  }

  const lastIndex = Math.min(targetIndex, visible.length - 1);
  if (visibleIndex < 0 || visibleIndex === lastIndex) return null;
  return { visibilityChanged: false, visible: arrayMove(visible, visibleIndex, lastIndex), hidden };
}
