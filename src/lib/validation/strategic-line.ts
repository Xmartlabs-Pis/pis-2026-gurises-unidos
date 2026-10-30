import { z } from 'zod';

export const strategicLineSchema = z.object({
  name: z
    .string({ error: 'Ingresá un nombre para la línea estratégica' })
    .trim()
    .min(1, 'Ingresá un nombre para la línea estratégica')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
});

export type StrategicLineFormData = z.infer<typeof strategicLineSchema>;
