/** @vitest-environment node */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/uploads/covers/[file]/route';
import { saveCoverPhoto } from '@/lib/projects/cover-photo';

async function jpegCover() {
  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(bytes)], 'cover.jpg', { type: 'image/jpeg' });
}

function getCover(file: string) {
  return GET(new Request(`http://localhost/uploads/covers/${file}`), {
    params: Promise.resolve({ file }),
  });
}

describe('GET /uploads/covers/[file]', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'covers-'));
    process.env.COVER_UPLOAD_DIR = directory;
  });

  afterEach(async () => {
    delete process.env.COVER_UPLOAD_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it('returns 404 for a path that is not an uploaded cover', async () => {
    const response = await getCover('not-a-uuid.webp');
    expect(response.status).toBe(404);
  });

  it('returns 404 when the file is missing', async () => {
    const response = await getCover('11111111-1111-4111-8111-111111111111.webp');
    expect(response.status).toBe(404);
  });

  it('returns the stored webp', async () => {
    const saved = await saveCoverPhoto(await jpegCover());
    if (!('path' in saved)) throw new Error('expected a stored cover');
    const file = path.basename(saved.path);
    const response = await getCover(file);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    const body = Buffer.from(await response.arrayBuffer());
    expect(await sharp(body).metadata()).toMatchObject({ format: 'webp' });
  });
});
