import prisma from '@/lib/prisma';
import {
  COVER_PENDING_TTL_MS,
  deleteUploadedCover,
  listCoverOwnerRecords,
  readCoverOwner,
} from '@/lib/projects/cover-photo';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

async function discardUploadedCover(coverPath: string | null) {
  if (!coverPath) return;
  try {
    await deleteUploadedCover(coverPath);
  } catch (error) {
    console.error('Failed to delete cover photo', error);
  }
}

export async function discardUnusedUploadedCover(coverPath: string | null) {
  if (!coverPath || !isUploadedCoverPath(coverPath)) return;
  try {
    const inUse = await prisma.project.findFirst({
      where: { coverPhoto: coverPath, deletedAt: null },
      select: { id: true },
    });
    if (inUse) return;
    await discardUploadedCover(coverPath);
  } catch (error) {
    console.error('Failed to delete cover photo', error);
  }
}

export async function discardOwnedUnusedCover(coverPath: string | null, userId: number) {
  const owner = coverPath ? await readCoverOwner(coverPath) : null;
  if (!owner || owner.userId !== userId) return;
  await discardUnusedUploadedCover(coverPath);
}

export async function ownedUploadedCoverPath(coverPath: string | null, userId: number) {
  const owner = coverPath ? await readCoverOwner(coverPath) : null;
  return owner?.userId === userId ? coverPath : null;
}

export async function discardExpiredUnusedCovers(now = new Date()) {
  const cutoff = now.getTime() - COVER_PENDING_TTL_MS;
  for (const record of await listCoverOwnerRecords()) {
    if (record.createdAt.getTime() > cutoff) continue;
    await discardUnusedUploadedCover(record.path);
  }
}
