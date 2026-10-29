import { z } from 'zod';
import { MAX_INT32 } from './ids';
import { DIRECT_CHILDREN_KEY } from '@/lib/project-display';
import { INTENSITY_REQUIRED_MESSAGE, projectSchema } from './project';
import { beneficiaryYear, buildBeneficiaryCountsShape } from './project-beneficiary';

export const MAX_STRATEGIC_LINES = 3;
export const TOPICS_ERROR_MESSAGE = 'Elegí temáticas válidas';
export const MAX_PLACE_NAME_LENGTH = 50;
export const LOCATIONS_ERROR_MESSAGE = 'Elegí departamentos válidos';
export const CITIES_REQUIRED_MESSAGE = 'Ingresá al menos una ciudad';

const placeName = z
  .string()
  .trim()
  .max(MAX_PLACE_NAME_LENGTH, `Máx. ${MAX_PLACE_NAME_LENGTH} caracteres por valor`);

export function getLocationKey({
  departmentId,
  city,
  neighborhood,
}: {
  departmentId: number | string;
  city: string;
  neighborhood: string;
}) {
  return [departmentId, city, neighborhood]
    .map((part) => String(part).trim().toLocaleLowerCase('es'))
    .join('|');
}

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
  topicIds: z
    .array(
      z.coerce
        .number({ error: TOPICS_ERROR_MESSAGE })
        .int(TOPICS_ERROR_MESSAGE)
        .positive(TOPICS_ERROR_MESSAGE)
        .max(MAX_INT32, TOPICS_ERROR_MESSAGE)
    )
    .min(1, 'Seleccioná al menos una temática')
    .refine((ids) => new Set(ids).size === ids.length, 'No repitas temáticas'),
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
  countries: placeNames('No repitas países'),
  locations: z
    .array(
      z.object(
        {
          departmentId: z.coerce
            .number({ error: LOCATIONS_ERROR_MESSAGE })
            .int(LOCATIONS_ERROR_MESSAGE)
            .positive(LOCATIONS_ERROR_MESSAGE)
            .max(MAX_INT32, LOCATIONS_ERROR_MESSAGE),
          city: placeName,
          neighborhood: placeName,
        },
        { error: LOCATIONS_ERROR_MESSAGE }
      )
    )
    .refine((locations) => locations.every(({ city }) => city), CITIES_REQUIRED_MESSAGE)
    .refine(
      (locations) => new Set(locations.map(getLocationKey)).size === locations.length,
      'No repitas ubicaciones'
    ),
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
    .refine((data) => data.geographicScope !== 'national' || data.locations.length > 0, {
      message: 'Agregá al menos una ubicación',
      path: ['locations'],
    })
    .refine((data) => data.geographicScope !== 'international' || data.countries.length > 0, {
      message: 'Ingresá al menos un país',
      path: ['countries'],
    });
}

export type ProjectFormData = z.infer<typeof baseProjectFormSchema>;

export function splitProjectFormData(data: ProjectFormData, keys: readonly string[]) {
  const { year, topicIds, strategicLineIds, countries, locations, ...rest } = data;
  const fields: Record<string, unknown> = rest;
  const counts = Object.fromEntries(keys.map((key) => [key, fields[key] as number]));
  for (const key of keys) delete fields[key];
  const isNational = rest.geographicScope === 'national';
  const nationalLocations = isNational ? locations : [];

  return {
    projectData: { ...rest, countries: isNational ? [] : countries },
    beneficiaryData: { year, counts },
    topicIds,
    strategicLineIds,
    departmentIds: [...new Set(nationalLocations.map(({ departmentId }) => departmentId))],
    localities: nationalLocations.map(({ departmentId, city, neighborhood }) => ({
      departmentId,
      city,
      neighborhood: neighborhood || null,
    })),
  };
}

export function readProjectFormData(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    topicIds: formData.getAll('topicIds'),
    strategicLineIds: formData.getAll('strategicLineIds'),
    countries: formData.getAll('countries'),
    locations: formData.getAll('locations').map(parseLocation),
  };
}

function parseLocation(value: FormDataEntryValue) {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}
