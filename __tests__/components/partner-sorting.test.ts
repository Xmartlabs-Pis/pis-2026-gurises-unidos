import { expect, test, vi } from 'vitest';
import {
  HIDDEN_ZONE_ID,
  VISIBLE_ZONE_ID,
  createPartnerSortingStrategy,
  getPartnerPlacement,
} from '@/components/metrics/partner-sorting';

test('packs variable-width pills into rows without overlap or scaling', () => {
  const rects = [
    new DOMRect(20, 30, 240, 44),
    new DOMRect(272, 30, 120, 44),
    new DOMRect(20, 86, 180, 44),
    new DOMRect(212, 86, 160, 44),
  ];
  const layout = { left: 20, top: 30, width: 400, gap: 12 };
  const strategy = createPartnerSortingStrategy(layout);
  const transformed = rects.map((rect, index) => {
    const transform = strategy({
      rects,
      activeIndex: 0,
      overIndex: 3,
      index,
      activeNodeRect: rects[0],
    })!;
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
    return new DOMRect(rect.x + transform.x, rect.y + transform.y, rect.width, rect.height);
  });
  expect(transformed.map(({ x, y }) => ({ x, y }))).toEqual([
    { x: 20, y: 142 },
    { x: 20, y: 30 },
    { x: 152, y: 30 },
    { x: 20, y: 86 },
  ]);
  expect(strategy.getHeight(0, 3)).toBe(156);
  expect(strategy.getHeight(0, 0)).toBe(100);
  for (const [index, rect] of transformed.entries()) {
    expect(rect.right).toBeLessThanOrEqual(layout.left + layout.width);
    for (const other of transformed.slice(index + 1)) {
      expect(
        rect.right <= other.left ||
          other.right <= rect.left ||
          rect.bottom <= other.top ||
          other.bottom <= rect.top
      ).toBe(true);
    }
  }
});

test('measures once per drag and reuses positions for previously visited targets', () => {
  const rects = [new DOMRect(0, 0, 100, 44), new DOMRect(112, 0, 100, 44)];
  const readWidth = vi.fn(() => 100);
  Object.defineProperty(rects[0], 'width', { get: readWidth });
  const layout = { left: 0, top: 0, width: 300, gap: 12 };
  const strategy = createPartnerSortingStrategy(layout);
  const args = { rects, activeIndex: 0, overIndex: 1, index: 0, activeNodeRect: rects[0] };
  const first = strategy(args);
  strategy({ ...args, index: 1 });
  strategy({ ...args, overIndex: 0 });
  expect(strategy(args)).toBe(first);
  expect(readWidth).toHaveBeenCalledTimes(1);
  createPartnerSortingStrategy(layout)(args);
  expect(readWidth).toHaveBeenCalledTimes(2);
});

const visible = [
  { id: 1, showPublicly: true },
  { id: 2, showPublicly: true },
];
const hidden = [{ id: 3, showPublicly: false }];

test('hides a visible partner dropped on the hidden zone', () => {
  expect(getPartnerPlacement(visible, hidden, 1, HIDDEN_ZONE_ID)).toEqual({
    visibilityChanged: true,
    visible: [{ id: 2, showPublicly: true }],
    hidden: [
      { id: 3, showPublicly: false },
      { id: 1, showPublicly: false },
    ],
  });
});

test('shows a hidden partner at the position where it is dropped', () => {
  expect(getPartnerPlacement(visible, hidden, 3, 2)).toEqual({
    visibilityChanged: true,
    visible: [
      { id: 1, showPublicly: true },
      { id: 3, showPublicly: true },
      { id: 2, showPublicly: true },
    ],
    hidden: [],
  });
});

test('shows a hidden partner at the end when dropped on the empty part of the zone', () => {
  const placement = getPartnerPlacement(visible, hidden, 3, VISIBLE_ZONE_ID);
  expect(placement?.visible.map(({ id }) => id)).toEqual([1, 2, 3]);
});

test('reorders inside the visible zone without changing visibility', () => {
  const placement = getPartnerPlacement(visible, hidden, 1, 2);
  expect(placement?.visibilityChanged).toBe(false);
  expect(placement?.visible.map(({ id }) => id)).toEqual([2, 1]);
});

test('ignores drops that change nothing', () => {
  expect(getPartnerPlacement(visible, hidden, 3, HIDDEN_ZONE_ID)).toBeNull();
  expect(getPartnerPlacement(visible, hidden, 2, VISIBLE_ZONE_ID)).toBeNull();
});
