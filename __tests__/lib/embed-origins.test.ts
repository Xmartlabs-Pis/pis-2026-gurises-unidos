import { describe, expect, it } from 'vitest';
import { getEmbedHeightOrigins } from '@/lib/embed-origins';

describe('getEmbedHeightOrigins', () => {
  it('returns the origin of each allowed site', () => {
    expect(
      getEmbedHeightOrigins('  https://gurisesunidos.org.uy/impacto  http://localhost:4100 ')
    ).toEqual(['https://gurisesunidos.org.uy', 'http://localhost:4100']);
  });

  it('keeps the wildcard that allows any site', () => {
    expect(getEmbedHeightOrigins('*')).toEqual(['*']);
  });

  it('skips sources that are not a single origin', () => {
    expect(
      getEmbedHeightOrigins("'self' 'none' https://*.example.org example.org https:// http://[bad")
    ).toEqual([]);
  });

  it('returns nothing when no site is allowed', () => {
    expect(getEmbedHeightOrigins('')).toEqual([]);
    expect(getEmbedHeightOrigins(undefined)).toEqual([]);
  });
});
