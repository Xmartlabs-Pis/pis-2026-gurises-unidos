'use server';

import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

export type ReusableCover = {
  path: string;
  projectName: string;
  usedBy: number;
};

export async function listProjectCovers() {
  await requireUser();
  const rows = await prisma.project.findMany({
    where: {
      deletedAt: null,
      coverPhoto: { startsWith: '/uploads/covers/' },
    },
    select: { coverPhoto: true, name: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
  const covers: ReusableCover[] = [];
  const indexByPath = new Map<string, number>();
  for (const { coverPhoto, name } of rows) {
    if (!coverPhoto || !isUploadedCoverPath(coverPhoto)) continue;
    const existing = indexByPath.get(coverPhoto);
    if (existing === undefined) {
      indexByPath.set(coverPhoto, covers.length);
      covers.push({ path: coverPhoto, projectName: name, usedBy: 1 });
      continue;
    }
    covers[existing].usedBy += 1;
  }
  return covers;
}
