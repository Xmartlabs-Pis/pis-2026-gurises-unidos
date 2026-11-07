import { z } from 'zod';
import { MAX_INT32 } from '@/lib/validation/ids';

export const IMPACT_REPORT_MAX_PROJECTS = 1000;

export const impactReportRequestSchema = z.object({
  year: z.number().int().positive(),
  projectIds: z
    .array(z.number().int().positive().max(MAX_INT32))
    .min(1)
    .max(IMPACT_REPORT_MAX_PROJECTS)
    .transform((ids) => [...new Set(ids)]),
});

export type ImpactReportRequest = z.input<typeof impactReportRequestSchema>;
