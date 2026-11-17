import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEmbedHeightOrigins } from '@/lib/embed-origins';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getEmbedHeightOrigins', () => {
  it('returns the origin of each allowed site', () => {
    expect(
      getEmbedHeightOrigins('  https://gurisesunidos.org.uy/impacto  http://localhost:4100 ')
    ).toEqual(['https://gurisesunidos.org.uy', 'http://localhost:4100']);
  });

  it('sends each origin once', () => {
    expect(getEmbedHeightOrigins('https://a.org https://a.org/path https://b.org')).toEqual([
      'https://a.org',
      'https://b.org',
    ]);
  });

  it('sends only the wildcard when it is combined with specific origins', () => {
    expect(getEmbedHeightOrigins('https://a.org * https://b.org *')).toEqual(['*']);
  });

  it('reads the allowed sites from the environment', () => {
    vi.stubEnv('EMBED_FRAME_ANCESTORS', 'https://gurisesunidos.org.uy');
    expect(getEmbedHeightOrigins()).toEqual(['https://gurisesunidos.org.uy']);
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
    vi.stubEnv('EMBED_FRAME_ANCESTORS', undefined);
    expect(getEmbedHeightOrigins()).toEqual([]);
  });
});
