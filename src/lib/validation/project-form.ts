import { z } from 'zod';
import { MAX_INT32 } from './ids';
import { DIRECT_CHILDREN_KEY } from '@/lib/project-display';
import { INTENSITY_REQUIRED_MESSAGE, projectSchema } from './project';
import { beneficiaryYear, buildBeneficiaryCountsShape } from './project-beneficiary';

export const MAX_STRATEGIC_LINES = 3;
export const MAX_PLACE_NAME_LENGTH = 100;

function placeNames(duplicateMessage: string) {
  return z
    .array(z.string())
    .transform((names) => names.map((name) => name.trim()).filter(Boolean))
    .refine(
      (names) => names.every((name) => name.length <= MAX_PLACE_NAME_LENGTH),
      `Máx. ${MAX_PLACE_NAME_LENGTH} caracteres por valor`
    )
    .refine(
      (names) => new Set(names.map((name) => name.toLocaleLowerCase('es'))).size === names.length,
      duplicateMessage
    );
}

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
  geographicScope: z.enum(['national', 'international'], {
    error: 'Seleccioná un alcance geográfico',
  }),
  departmentIds: z
    .array(
      z.coerce
        .number({ error: 'Elegí departamentos válidos' })
        .int('Elegí departamentos válidos')
        .positive('Elegí departamentos válidos')
        .max(MAX_INT32, 'Elegí departamentos válidos')
    )
    .refine((ids) => new Set(ids).size === ids.length, 'No repitas departamentos'),
  countries: placeNames('No repitas países'),
  cities: placeNames('No repitas ciudades'),
  neighborhoods: placeNames('No repitas barrios'),
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
    )
    .refine((data) => data.geographicScope !== 'national' || data.departmentIds.length > 0, {
      message: 'Seleccioná al menos un departamento',
      path: ['departmentIds'],
    })
    .refine((data) => data.geographicScope !== 'international' || data.countries.length > 0, {
      message: 'Ingresá al menos un país',
      path: ['countries'],
    });
}

export type ProjectFormData = z.infer<typeof baseProjectFormSchema>;

export function splitProjectFormData(data: ProjectFormData, keys: readonly string[]) {
  const { year, strategicLineIds, departmentIds, countries, cities, neighborhoods, ...rest } = data;
  const fields: Record<string, unknown> = rest;
  const counts = Object.fromEntries(keys.map((key) => [key, fields[key] as number]));
  for (const key of keys) delete fields[key];
  const isNational = rest.geographicScope === 'national';
  const nationalCities = isNational ? cities : [];

  return {
    projectData: {
      ...rest,
      countries: isNational ? [] : countries,
      cities: nationalCities,
      neighborhoods: nationalCities.length > 0 ? neighborhoods : [],
    },
    beneficiaryData: { year, counts },
    strategicLineIds,
    departmentIds: isNational ? departmentIds : [],
  };
}

export function readProjectFormData(formData: FormData) {
  const topicValues = formData.getAll('topicId');
  const strategicLineValues = formData.getAll('strategicLineIds');

  return {
    ...Object.fromEntries(formData),
    topicId: topicValues.length > 1 ? 'invalid' : topicValues[0],
    strategicLineIds: strategicLineValues,
    departmentIds: formData.getAll('departmentIds'),
    countries: formData.getAll('countries'),
    cities: formData.getAll('cities'),
    neighborhoods: formData.getAll('neighborhoods'),
  };
}
