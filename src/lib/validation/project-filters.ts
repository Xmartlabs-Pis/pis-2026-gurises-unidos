import { z } from 'zod';
import {
  ALL_FILTER_VALUE,
  firstValue,
  toSingleValues,
  type CanonicalQuery,
} from '@/lib/url-filters';

export const PROJECT_LIST_PAGE_SIZE = 20;
export const PROJECT_LIST_MAX_PAGE_SIZE = 100;
export const PROJECT_MIN_START_YEAR = 1989;
export const PROJECT_SEARCH_MAX_LENGTH = 100;
export const DEFAULT_PROJECT_STATUS = 'active';

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
    strategicLineId: optionalPositiveInt,
    beneficiaryCategoryId: optionalPositiveInt,
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
  return projectFiltersSchema.parse(toSingleValues(raw));
}

type ProjectFilterOptions = {
  years: number[];
  departments: { id: number }[];
  topics: { id: number }[];
  strategicLines: { id: number }[];
  beneficiaryCategories: { id: number }[];
};

export function resolveProjectListFilters(
  raw: RawProjectFilters,
  { years, departments, topics, strategicLines, beneficiaryCategories }: ProjectFilterOptions
): { canonical: CanonicalQuery; filters: ProjectFilters } {
  const parsed = parseProjectFilters(raw);

  const status = firstValue(raw.status) === ALL_FILTER_VALUE ? ALL_FILTER_VALUE : parsed.status;
  const beneficiaryYear =
    firstValue(raw.beneficiaryYear) === ALL_FILTER_VALUE
      ? ALL_FILTER_VALUE
      : years.find((year) => year === parsed.beneficiaryYear);
  const departmentId = departments.find(({ id }) => id === parsed.departmentId)?.id;
  const topicId = topics.find(({ id }) => id === parsed.topicId)?.id;
  const strategicLineId = strategicLines.find(({ id }) => id === parsed.strategicLineId)?.id;
  const beneficiaryCategoryId = beneficiaryCategories.find(
    ({ id }) => id === parsed.beneficiaryCategoryId
  )?.id;

  return {
    canonical: {
      status,
      beneficiaryYear,
      search: parsed.search,
      departmentId,
      topicId,
      strategicLineId,
      beneficiaryCategoryId,
    },
    filters: parseProjectFilters({
      status: status ?? DEFAULT_PROJECT_STATUS,
      beneficiaryYear: String(beneficiaryYear ?? years[0] ?? ''),
      search: parsed.search,
      departmentId: departmentId?.toString(),
      topicId: topicId?.toString(),
      strategicLineId: strategicLineId?.toString(),
      beneficiaryCategoryId: beneficiaryCategoryId?.toString(),
      pageSize: String(PROJECT_LIST_PAGE_SIZE),
    }),
  };
}
