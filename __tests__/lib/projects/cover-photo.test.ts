import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { access } from 'node:fs/promises';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  coverPathFromForm,
  deleteUploadedCover,
  readCoverOwner,
  saveCoverPhoto,
} from '@/lib/projects/cover-photo';
import { PROJECT_PLACEHOLDERS } from '@/lib/projects/project-placeholders';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

const OWNER_ID = 7;

const UPLOADED_COVER = '/uploads/covers/11111111-1111-4111-8111-111111111111.webp';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'covers-'));
  process.env.COVER_UPLOAD_DIR = directory;
});

afterEach(async () => {
  delete process.env.COVER_UPLOAD_DIR;
  await rm(directory, { recursive: true, force: true });
});

async function imageFile(format: 'jpeg' | 'png', width: number, height: number, name: string) {
  const pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 80, b: 160 },
    },
  });
  const bytes =
    format === 'jpeg' ? await pipeline.jpeg().toBuffer() : await pipeline.png().toBuffer();
  return new File([new Uint8Array(bytes)], name, {
    type: format === 'jpeg' ? 'image/jpeg' : 'image/png',
  });
}

describe('saveCoverPhoto', () => {
  it('stores a resized webp and leaves a small image at its original size', async () => {
    const large = await saveCoverPhoto(await imageFile('jpeg', 2000, 1000, 'large.jpg'), OWNER_ID);
    const small = await saveCoverPhoto(await imageFile('png', 80, 40, 'small.png'), OWNER_ID);

    expect(large).toEqual({
      path: expect.stringMatching(
        /^\/uploads\/covers\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/
      ),
    });
    if (!('path' in large) || !('path' in small)) return;

    const largeMeta = await sharp(
      path.join(directory, 'covers', path.basename(large.path))
    ).metadata();
    const smallMeta = await sharp(
      path.join(directory, 'covers', path.basename(small.path))
    ).metadata();
    expect(largeMeta).toMatchObject({ format: 'webp', width: 1600, height: 800 });
    expect(smallMeta).toMatchObject({ format: 'webp', width: 80, height: 40 });
    await expect(readCoverOwner(large.path)).resolves.toEqual({
      path: large.path,
      userId: OWNER_ID,
      createdAt: expect.any(Date),
    });
  });

  it('rejects a file that is not a jpeg or png', async () => {
    const file = new File([new TextEncoder().encode('not an image')], 'note.jpg', {
      type: 'image/jpeg',
    });
    await expect(saveCoverPhoto(file, OWNER_ID)).resolves.toEqual({
      error: 'La imagen debe ser JPG o PNG.',
    });
  });

  it('rejects a file larger than 5 MB before writing', async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    await expect(saveCoverPhoto(file, OWNER_ID)).resolves.toEqual({
      error: 'La imagen no puede superar los 5 MB.',
    });
    await expect(access(path.join(directory, 'covers'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('deleteUploadedCover', () => {
  it('deletes an uploaded cover and ignores placeholders and other paths', async () => {
    const saved = await saveCoverPhoto(await imageFile('jpeg', 20, 20, 'cover.jpg'), OWNER_ID);
    if (!('path' in saved)) throw new Error('expected a stored cover');
    const stored = path.join(directory, 'covers', path.basename(saved.path));
    const owner = path.join(directory, 'covers', `${path.basename(saved.path, '.webp')}.json`);

    await deleteUploadedCover(saved.path);
    await expect(access(stored)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(owner)).rejects.toMatchObject({ code: 'ENOENT' });

    await expect(deleteUploadedCover(PROJECT_PLACEHOLDERS[0])).resolves.toBeUndefined();
    await expect(
      deleteUploadedCover('/uploads/covers/../../package.json')
    ).resolves.toBeUndefined();
    await expect(deleteUploadedCover(UPLOADED_COVER)).resolves.toBeUndefined();
  });
});

describe('isUploadedCoverPath', () => {
  it('accepts only a cover path this server writes', () => {
    expect(isUploadedCoverPath(UPLOADED_COVER)).toBe(true);
    expect(isUploadedCoverPath(PROJECT_PLACEHOLDERS[0])).toBe(false);
    expect(isUploadedCoverPath('/uploads/covers/not-a-uuid.webp')).toBe(false);
    expect(isUploadedCoverPath('https://invalid.test/photo.png')).toBe(false);
  });
});

describe('coverPathFromForm', () => {
  it('accepts only a cover path this server writes', () => {
    const data = new FormData();
    data.set('coverPhotoPath', UPLOADED_COVER);
    expect(coverPathFromForm(data)).toBe(UPLOADED_COVER);
    data.set('coverPhotoPath', 'https://invalid.test/photo.png');
    expect(coverPathFromForm(data)).toBeNull();
  });
});
