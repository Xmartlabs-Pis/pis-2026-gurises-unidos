import { arrayMove, type SortingStrategy } from '@dnd-kit/sortable';

export type ContributorSortingStrategy = SortingStrategy & {
  getHeight: (activeIndex: number, overIndex: number) => number | undefined;
};

export function createContributorSortingStrategy({
  left,
  top,
  width,
  gap,
}: {
  left: number;
  top: number;
  width: number;
  gap: number;
}): ContributorSortingStrategy {
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
