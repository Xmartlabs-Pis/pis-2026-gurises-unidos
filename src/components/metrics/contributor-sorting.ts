import { arrayMove, type SortingStrategy } from '@dnd-kit/sortable';

export function getContributorSortingTransform(
  { rects, activeIndex, overIndex, index }: Parameters<SortingStrategy>[0],
  { left, top, width, gap }: { left: number; top: number; width: number; gap: number }
) {
  const currentRect = rects[index];
  if (!currentRect || activeIndex < 0 || overIndex < 0) return null;
  const orderedIndices = arrayMove(
    rects.map((_, itemIndex) => itemIndex),
    activeIndex,
    overIndex
  );
  let x = left;
  let y = top;
  let rowHeight = 0;

  for (const itemIndex of orderedIndices) {
    const rect = rects[itemIndex];
    if (!rect) continue;
    if (x > left && x + rect.width > left + width + 0.5) {
      x = left;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    if (itemIndex === index) {
      return { x: x - currentRect.left, y: y - currentRect.top, scaleX: 1, scaleY: 1 };
    }
    x += rect.width + gap;
    rowHeight = Math.max(rowHeight, rect.height);
  }
  return null;
}
