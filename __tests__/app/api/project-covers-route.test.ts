/** @vitest-environment node */
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/projects/covers/route';
import { getActiveUser } from '@/lib/auth/require-user';
import prisma from '@/lib/prisma';
import { TOO_LARGE_MESSAGE } from '@/lib/projects/cover-photo';

vi.mock('@/lib/auth/require-user', () => ({ getActiveUser: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: { project: { findFirst: vi.fn() } },
}));

const ADMIN = { id: 7, role: 'admin' as const, status: 'active' as const, deletedAt: null };
const COORDINATOR = {
  id: 3,
  role: 'coordinator' as const,
  status: 'active' as const,
  deletedAt: null,
};

async function jpegCover() {
  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(bytes)], 'cover.jpg', { type: 'image/jpeg' });
}

async function coverRequest(body: FormData, headers?: HeadersInit) {
  const request = new NextRequest('http://localhost/api/projects/covers', {
    method: 'POST',
    headers,
  });
  vi.spyOn(request, 'formData').mockResolvedValue(body);
  return POST(request);
}

describe('POST /api/projects/covers', () => {
  let directory: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(getActiveUser).mockResolvedValue(ADMIN);
    directory = await mkdtemp(path.join(tmpdir(), 'covers-'));
    process.env.COVER_UPLOAD_DIR = directory;
  });

  afterEach(async () => {
    delete process.env.COVER_UPLOAD_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it('rejects requests without a session', async () => {
    vi.mocked(getActiveUser).mockResolvedValue(null);
    const data = new FormData();
    data.set('coverPhoto', await jpegCover());
    const response = await coverRequest(data);
    expect(response.status).toBe(401);
    await expect(access(path.join(directory, 'covers'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not write a file when the user cannot edit the project', async () => {
    vi.mocked(getActiveUser).mockResolvedValue(COORDINATOR);
    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      id: 10,
      leadCoordinatorId: 2,
    } as never);
    const data = new FormData();
    data.set('projectId', '10');
    data.set('coverPhoto', await jpegCover());
    const response = await coverRequest(data);
    expect(response.status).toBe(403);
    await expect(access(path.join(directory, 'covers'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('stores a cover for a signed-in user creating a project', async () => {
    const data = new FormData();
    data.set('coverPhoto', await jpegCover());
    const response = await coverRequest(data);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.path).toMatch(
      /^\/uploads\/covers\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/
    );
    expect(await readdir(path.join(directory, 'covers'))).toEqual([path.basename(body.path)]);
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a file that is not a jpeg or png', async () => {
    const data = new FormData();
    data.set(
      'coverPhoto',
      new File([new TextEncoder().encode('note')], 'note.jpg', { type: 'image/jpeg' })
    );
    const response = await coverRequest(data);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'La imagen debe ser JPG o PNG.' });
    await expect(access(path.join(directory, 'covers'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects an oversized body before reading it', async () => {
    const response = await coverRequest(new FormData(), {
      'content-length': String(6 * 1024 * 1024 + 1),
    });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: TOO_LARGE_MESSAGE });
    await expect(access(path.join(directory, 'covers'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
