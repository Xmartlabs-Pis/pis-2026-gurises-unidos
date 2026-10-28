import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COVER_PENDING_TTL_MS } from '@/lib/projects/cover-photo';

const { findLiveCoverMock } = vi.hoisted(() => ({
  findLiveCoverMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findFirst: findLiveCoverMock },
  },
}));

import {
  discardExpiredUnusedCovers,
  discardOwnedUnusedCover,
  ownedUploadedCoverPath,
} from '@/lib/projects/pending-cover';

const OWNED = '/uploads/covers/11111111-1111-4111-8111-111111111111.webp';
const OTHER = '/uploads/covers/22222222-2222-4222-8222-222222222222.webp';

let directory: string;

async function writeCover(
  coverPath: string,
  userId: number | null,
  createdAt = new Date(),
  contents = 'cover'
) {
  const id = path.basename(coverPath, '.webp');
  const dir = path.join(directory, 'covers');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.webp`), contents);
  if (userId != null) {
    await writeFile(
      path.join(dir, `${id}.json`),
      JSON.stringify({ userId, createdAt: createdAt.toISOString() })
    );
  }
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'covers-'));
  process.env.COVER_UPLOAD_DIR = directory;
  findLiveCoverMock.mockResolvedValue(null);
});

afterEach(async () => {
  delete process.env.COVER_UPLOAD_DIR;
  await rm(directory, { recursive: true, force: true });
});

describe('ownedUploadedCoverPath', () => {
  it('returns the path only when the current user owns it', async () => {
    await writeCover(OWNED, 7);
    await writeCover(OTHER, 3);
    await expect(ownedUploadedCoverPath(OWNED, 7)).resolves.toBe(OWNED);
    await expect(ownedUploadedCoverPath(OWNED, 3)).resolves.toBeNull();
    await expect(ownedUploadedCoverPath(OTHER, 7)).resolves.toBeNull();
    await expect(ownedUploadedCoverPath(null, 7)).resolves.toBeNull();
  });

  it('rejects a cover without an owner record', async () => {
    await writeCover(OWNED, null);
    await expect(ownedUploadedCoverPath(OWNED, 7)).resolves.toBeNull();
  });
});

describe('discardOwnedUnusedCover', () => {
  it('deletes the current user’s unused pending cover', async () => {
    await writeCover(OWNED, 7);
    await discardOwnedUnusedCover(OWNED, 7);
    expect(await readdir(path.join(directory, 'covers'))).toEqual([]);
  });

  it('leaves another user’s pending cover in place', async () => {
    await writeCover(OTHER, 3);
    await discardOwnedUnusedCover(OTHER, 7);
    expect((await readdir(path.join(directory, 'covers'))).sort()).toEqual([
      `${path.basename(OTHER, '.webp')}.json`,
      path.basename(OTHER),
    ]);
  });

  it('leaves a cover that a live project still uses', async () => {
    await writeCover(OWNED, 7);
    findLiveCoverMock.mockResolvedValue({ id: 99 });
    await discardOwnedUnusedCover(OWNED, 7);
    expect(await readdir(path.join(directory, 'covers'))).toEqual(
      expect.arrayContaining([`${path.basename(OWNED, '.webp')}.json`, path.basename(OWNED)])
    );
  });
});

describe('discardExpiredUnusedCovers', () => {
  it('deletes unused owned covers past the pending ttl', async () => {
    const stale = new Date(Date.now() - COVER_PENDING_TTL_MS - 1000);
    await writeCover(OWNED, 7, stale);
    await writeCover(OTHER, 3, new Date());
    await discardExpiredUnusedCovers();
    expect(await readdir(path.join(directory, 'covers'))).toEqual(
      expect.arrayContaining([`${path.basename(OTHER, '.webp')}.json`, path.basename(OTHER)])
    );
    expect(await readdir(path.join(directory, 'covers'))).not.toContain(path.basename(OWNED));
  });

  it('leaves an expired cover that a live project still uses', async () => {
    const stale = new Date(Date.now() - COVER_PENDING_TTL_MS - 1000);
    await writeCover(OWNED, 7, stale);
    findLiveCoverMock.mockResolvedValue({ id: 99 });
    await discardExpiredUnusedCovers();
    expect(await readdir(path.join(directory, 'covers'))).toEqual(
      expect.arrayContaining([`${path.basename(OWNED, '.webp')}.json`, path.basename(OWNED)])
    );
  });
});
