import { z } from 'zod';

export const partnerNameSchema = z.object({
  name: z
    .string({ error: 'Ingresá un nombre para el socio' })
    .trim()
    .min(1, 'Ingresá un nombre para el socio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
});

export const partnerSchema = partnerNameSchema.extend({
  counterpartyType: z.enum(['publicSector', 'privateSector', 'internationalCooperation'], {
    error: 'Seleccioná un tipo de contraparte',
  }),
});
