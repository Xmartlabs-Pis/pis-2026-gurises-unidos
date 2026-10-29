import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { coverUploadRoot } from '@/lib/projects/cover-photo';
import { uploadedCoverId } from '@/lib/projects/uploaded-cover';

export async function GET(_request: Request, ctx: RouteContext<'/uploads/covers/[file]'>) {
  const { file } = await ctx.params;
  const id = uploadedCoverId(`/uploads/covers/${file}`);
  if (!id) return new Response(null, { status: 404 });
  try {
    const image = await readFile(path.join(coverUploadRoot(), 'covers', `${id}.webp`));
    return new Response(image, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
