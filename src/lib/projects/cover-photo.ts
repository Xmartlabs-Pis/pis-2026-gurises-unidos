import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { isUploadedCoverPath, uploadedCoverId } from '@/lib/projects/uploaded-cover';

const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_EDGE = 1600;
const WEBP_QUALITY = 80;
const MAX_INPUT_PIXELS = 40_000_000;

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const INVALID_IMAGE_MESSAGE = 'La imagen debe ser JPG o PNG.';
export const TOO_LARGE_MESSAGE = 'La imagen no puede superar los 5 MB.';
export const COVER_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export function coverUploadRoot() {
  return process.env.COVER_UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
}

type CoverUpload = {
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isCoverUpload(value: unknown): value is CoverUpload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'size' in value &&
    typeof value.size === 'number' &&
    value.size > 0 &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

export function coverFileFromForm(formData: FormData) {
  const value = formData.get('coverPhoto');
  return isCoverUpload(value) ? value : null;
}

export function coverPathFromForm(formData: FormData) {
  const value = formData.get('coverPhotoPath');
  return isUploadedCoverPath(value) ? value : null;
}

export function wantsCoverRemoved(formData: FormData) {
  return formData.get('removeCoverPhoto') === 'true';
}

function hasSignature(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function isJpegOrPng(bytes: Uint8Array) {
  return hasSignature(bytes, JPEG_SIGNATURE) || hasSignature(bytes, PNG_SIGNATURE);
}

function isMissingFile(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function coverAssetPaths(id: string) {
  const directory = path.join(coverUploadRoot(), 'covers');
  return {
    directory,
    image: path.join(directory, `${id}.webp`),
    owner: path.join(directory, `${id}.json`),
  };
}

async function unlinkMissing(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
}

export type CoverOwnerRecord = {
  path: string;
  userId: number;
  createdAt: Date;
};

function parseCoverOwner(value: unknown): Omit<CoverOwnerRecord, 'path'> | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('userId' in value) || !('createdAt' in value)) return null;
  const userId = value.userId;
  if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) return null;
  if (typeof value.createdAt !== 'string') return null;
  const createdAt = new Date(value.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { userId, createdAt };
}

export async function readCoverOwner(coverPath: string): Promise<CoverOwnerRecord | null> {
  const id = isUploadedCoverPath(coverPath) ? uploadedCoverId(coverPath) : null;
  if (!id) return null;
  try {
    const parsed = parseCoverOwner(JSON.parse(await readFile(coverAssetPaths(id).owner, 'utf8')));
    return parsed ? { path: coverPath, ...parsed } : null;
  } catch {
    return null;
  }
}

export async function listCoverOwnerRecords(): Promise<CoverOwnerRecord[]> {
  const directory = path.join(coverUploadRoot(), 'covers');
  let files: string[];
  try {
    files = await readdir(directory);
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
  const records: CoverOwnerRecord[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const coverPath = `/uploads/covers/${file.slice(0, -'.json'.length)}.webp`;
    const owner = await readCoverOwner(coverPath);
    if (owner) records.push(owner);
  }
  return records;
}

export async function saveCoverPhoto(
  file: CoverUpload,
  userId: number
): Promise<{ path: string } | { error: string }> {
  if (file.size > MAX_COVER_BYTES) return { error: TOO_LARGE_MESSAGE };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpegOrPng(bytes)) return { error: INVALID_IMAGE_MESSAGE };

  let webp: Buffer;
  try {
    webp = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    return { error: INVALID_IMAGE_MESSAGE };
  }

  const id = randomUUID();
  const assets = coverAssetPaths(id);
  await mkdir(assets.directory, { recursive: true });
  try {
    await writeFile(assets.image, webp);
    await writeFile(assets.owner, JSON.stringify({ userId, createdAt: new Date().toISOString() }));
  } catch (error) {
    await unlinkMissing(assets.image);
    await unlinkMissing(assets.owner);
    throw error;
  }
  return { path: `/uploads/covers/${id}.webp` };
}

export async function deleteUploadedCover(coverPath: string | null | undefined) {
  const id = coverPath && isUploadedCoverPath(coverPath) ? uploadedCoverId(coverPath) : null;
  if (!id) return;
  const assets = coverAssetPaths(id);
  await unlinkMissing(assets.image);
  await unlinkMissing(assets.owner);
}
