import { FIRST_PROJECT_YEAR } from '@/lib/project-display';
import { parseId } from '@/lib/validation/ids';

type ProjectDetailInputResult =
  | {
      success: true;
      data: {
        projectId: number;
        year: number | undefined;
      };
    }
  | {
      success: false;
      field: 'projectId' | 'year';
    };

export function parseProjectDetailInput(
  rawProjectId: unknown,
  rawYear: unknown,
  currentYear: number
): ProjectDetailInputResult {
  const projectId = parseId(rawProjectId);

  if (projectId === null) {
    return { success: false, field: 'projectId' };
  }

  if (rawYear === undefined) {
    return {
      success: true,
      data: { projectId, year: undefined },
    };
  }

  const year = parseId(rawYear);

  if (year === null || year < FIRST_PROJECT_YEAR || year > currentYear) {
    return { success: false, field: 'year' };
  }

  return {
    success: true,
    data: { projectId, year },
  };
}
