import { z } from 'zod';
import { MAX_INT32 } from './ids';
import { DIRECT_CHILDREN_KEY } from '@/lib/project-display';
import { INTENSITY_REQUIRED_MESSAGE, projectSchema } from './project';
import { beneficiaryYear, buildBeneficiaryCountsShape } from './project-beneficiary';

export const MAX_STRATEGIC_LINES = 3;

const baseProjectFormSchema = projectSchema.safeExtend({
  year: beneficiaryYear,
  topicId: z.coerce
    .number({ error: 'Elegí una temática válida' })
    .int('Elegí una temática válida')
    .positive('Elegí una temática válida')
    .max(MAX_INT32),
  strategicLineIds: z
    .array(
      z.coerce
        .number({ error: 'Elegí líneas estratégicas válidas' })
        .int('Elegí líneas estratégicas válidas')
        .positive('Elegí líneas estratégicas válidas')
    )
    .min(1, 'Seleccioná al menos una línea estratégica')
    .max(MAX_STRATEGIC_LINES, `Podés seleccionar hasta ${MAX_STRATEGIC_LINES} líneas estratégicas`)
    .refine((ids) => new Set(ids).size === ids.length, 'No repitas líneas estratégicas'),
});

export function buildProjectFormSchema(keys: readonly string[]) {
  const schema = baseProjectFormSchema.safeExtend(
    buildBeneficiaryCountsShape(keys)
  ) as unknown as typeof baseProjectFormSchema;
  return schema
    .refine((data) => data.year >= data.startYear, {
      message: 'El año de beneficiarios no puede ser anterior al año de inicio',
      path: ['year'],
    })
    .refine(
      (data) => data.status !== 'inactive' || data.endYear === null || data.year <= data.endYear,
      {
        message: 'El año de beneficiarios no puede ser posterior al año de fin',
        path: ['year'],
      }
    )
    .refine(
      (data) =>
        data.intensity !== null ||
        !(Number((data as Record<string, unknown>)[DIRECT_CHILDREN_KEY]) > 0),
      { message: INTENSITY_REQUIRED_MESSAGE, path: ['intensity'] }
    );
}

export type ProjectFormData = z.infer<typeof baseProjectFormSchema>;

export function splitProjectFormData(data: ProjectFormData, keys: readonly string[]) {
  const { year, strategicLineIds, ...rest } = data;
  const fields: Record<string, unknown> = rest;
  const counts = Object.fromEntries(keys.map((key) => [key, fields[key] as number]));
  for (const key of keys) delete fields[key];

  return { projectData: rest, beneficiaryData: { year, counts }, strategicLineIds };
}

export function readProjectFormData(formData: FormData) {
  const topicValues = formData.getAll('topicId');
  const strategicLineValues = formData.getAll('strategicLineIds');

  return {
    ...Object.fromEntries(formData),
    topicId: topicValues.length > 1 ? 'invalid' : topicValues[0],
    strategicLineIds: strategicLineValues,
  };
}
