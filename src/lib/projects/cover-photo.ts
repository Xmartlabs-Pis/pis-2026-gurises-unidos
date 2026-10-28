import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
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

export function coverUploadRoot() {
  return process.env.COVER_UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
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

export async function saveCoverPhoto(
  file: CoverUpload
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

  const filename = `${randomUUID()}.webp`;
  const directory = path.join(coverUploadRoot(), 'covers');
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, filename);
  try {
    await writeFile(filePath, webp);
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
  return { path: `/uploads/covers/${filename}` };
}

export async function deleteUploadedCover(coverPath: string | null | undefined) {
  const id = coverPath && isUploadedCoverPath(coverPath) ? uploadedCoverId(coverPath) : null;
  if (!id) return;
  try {
    await unlink(path.join(coverUploadRoot(), 'covers', `${id}.webp`));
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
}
