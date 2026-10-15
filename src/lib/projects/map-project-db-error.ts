import { Prisma } from '@/generated/prisma/client';
import type { ProjectFormState } from '@/lib/validation/project';

export const DUPLICATE_PROJECT_MESSAGE = 'Ya existe un proyecto con ese nombre y año de inicio';

export function mapProjectDbError(error: unknown): ProjectFormState | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code === 'P2025') return { formError: 'El proyecto no existe o fue eliminado.' };
  if (error.code === 'P2002') {
    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
    const isNameYearIndex = fields.some((field) => field.includes('name_lower_startYear'));
    if ((fields.includes('name') && fields.includes('startYear')) || isNameYearIndex)
      return { errors: { name: [DUPLICATE_PROJECT_MESSAGE] } };
    return null;
  }
  if (error.code === 'P2003') {
    const constraint = String(error.meta?.field_name ?? error.meta?.constraint ?? '');
    if (constraint.includes('leadCoordinatorId') || constraint.includes('_DepartmentToProject'))
      return { formError: 'El coordinador o el departamento seleccionado no existe.' };
    if (constraint.includes('topicId'))
      return { errors: { topicId: ['Elegí una temática válida'] } };
    return { formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' };
  }
  return null;
}
