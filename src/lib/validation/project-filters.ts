import { z } from 'zod';

export const PROJECT_LIST_PAGE_SIZE = 20;
export const PROJECT_LIST_MAX_PAGE_SIZE = 100;
export const PROJECT_MIN_START_YEAR = 1989;
export const PROJECT_SEARCH_MAX_LENGTH = 100;

const optionalYear = z.coerce
  .number()
  .int()
  .min(PROJECT_MIN_START_YEAR)
  .refine((year) => year <= new Date().getFullYear())
  .optional()
  .catch(undefined);

const optionalPositiveInt = z.coerce.number().int().positive().optional().catch(undefined);

export const projectFiltersSchema = z
  .object({
    search: z
      .string()
      .trim()
      .optional()
      .catch(undefined)
      .transform((value) => value?.slice(0, PROJECT_SEARCH_MAX_LENGTH) || undefined),
    status: z.enum(['active', 'inactive']).optional().catch(undefined),
    intensity: z.enum(['high', 'medium', 'low']).optional().catch(undefined),
    leadCoordinatorId: optionalPositiveInt,
    departmentId: optionalPositiveInt,
    topicId: optionalPositiveInt,
    startYearFrom: optionalYear,
    startYearTo: optionalYear,
    beneficiaryYear: optionalYear,
    page: z.coerce.number().int().positive().catch(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive()
      .catch(PROJECT_LIST_PAGE_SIZE)
      .transform((size) => Math.min(size, PROJECT_LIST_MAX_PAGE_SIZE)),
  })
  .transform((filters) => {
    if (
      filters.startYearFrom !== undefined &&
      filters.startYearTo !== undefined &&
      filters.startYearFrom > filters.startYearTo
    ) {
      return { ...filters, startYearFrom: filters.startYearTo, startYearTo: filters.startYearFrom };
    }

    return filters;
  });

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

export type RawProjectFilters = Record<string, string | string[] | undefined>;

export function parseProjectFilters(raw: RawProjectFilters): ProjectFilters {
  const singleValued = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );

  return projectFiltersSchema.parse(singleValued);
}
