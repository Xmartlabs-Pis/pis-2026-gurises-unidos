import { getActiveUser } from '@/lib/auth/require-user';
import prisma from '@/lib/prisma';
import {
  coverFileFromForm,
  INVALID_IMAGE_MESSAGE,
  MAX_COVER_UPLOAD_BYTES,
  saveCoverPhoto,
  TOO_LARGE_MESSAGE,
} from '@/lib/projects/cover-photo';
import { discardExpiredUnusedCovers } from '@/lib/projects/pending-cover';
import { canEditProject } from '@/lib/projects/permissions';
import { parseId } from '@/lib/validation/ids';

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return jsonError('Tu sesión expiró. Volvé a iniciar sesión.', 401);

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_COVER_UPLOAD_BYTES) {
    return jsonError(TOO_LARGE_MESSAGE, 413);
  }

  const formData = await request.formData();
  const projectIdValue = formData.get('projectId');
  if (projectIdValue != null && projectIdValue !== '') {
    const projectId = parseId(typeof projectIdValue === 'string' ? projectIdValue : '');
    if (!projectId) return jsonError('El proyecto no es válido.', 400);
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, leadCoordinatorId: true },
    });
    if (!project) return jsonError('El proyecto no existe o fue eliminado.', 404);
    if (!canEditProject(user, project)) {
      return jsonError('No tenés permiso para editar este proyecto.', 403);
    }
  }

  const file = coverFileFromForm(formData);
  if (!file) return jsonError(INVALID_IMAGE_MESSAGE, 400);

  const saved = await saveCoverPhoto(file, user.id);
  if ('error' in saved) return jsonError(saved.error, 400);
  try {
    await discardExpiredUnusedCovers();
  } catch (error) {
    console.error('Failed to expire pending covers', error);
  }
  return Response.json({ path: saved.path }, { headers: { 'Cache-Control': 'no-store' } });
}
