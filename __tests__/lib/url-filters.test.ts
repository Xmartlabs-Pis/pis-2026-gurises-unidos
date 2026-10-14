import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import {
  buildCanonicalQuery,
  firstValue,
  isCanonical,
  redirectToCanonical,
} from '@/lib/url-filters';

beforeEach(() => {
  redirectMock.mockClear();
});

describe('firstValue', () => {
  it('returns the first item of repeated params', () => {
    expect(firstValue(['a', 'b'])).toBe('a');
    expect(firstValue('a')).toBe('a');
    expect(firstValue(undefined)).toBeUndefined();
  });
});

describe('buildCanonicalQuery', () => {
  it('drops empty values and sorts keys', () => {
    expect(buildCanonicalQuery({ status: 'active', q: undefined, search: '', topicId: 2 })).toBe(
      'status=active&topicId=2'
    );
  });
});

describe('isCanonical', () => {
  it('accepts the same params in any order', () => {
    expect(isCanonical({ topicId: '2', status: 'active' }, { status: 'active', topicId: 2 })).toBe(
      true
    );
  });

  it.each([
    [{ status: 'active', sasasasa: 'abcd' }],
    [{ status: 'dsfhj' }],
    [{ status: ['active', 'closed'] }],
  ])('rejects %j', (raw) => {
    expect(isCanonical(raw, { status: 'active' })).toBe(false);
  });
});

describe('redirectToCanonical', () => {
  it('does nothing when the url is already canonical', () => {
    redirectToCanonical('/path', { q: 'ana' }, { q: 'ana' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects to the canonical query', () => {
    expect(() =>
      redirectToCanonical('/path', { status: 'dsfhj', q: 'ana', extra: '1' }, { q: 'ana' })
    ).toThrow('NEXT_REDIRECT:/path?q=ana');
  });

  it('redirects to the bare path when no filter survives', () => {
    expect(() => redirectToCanonical('/path', { status: 'dsfhj' }, {})).toThrow(
      'NEXT_REDIRECT:/path'
    );
  });

  it('keeps encoded search terms stable', () => {
    redirectToCanonical('/path', { search: 'centro juvenil' }, { search: 'centro juvenil' });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
