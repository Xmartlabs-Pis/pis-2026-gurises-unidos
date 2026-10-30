import { z } from 'zod';

export const beneficiaryCategorySchema = z.object({
  name: z
    .string({ error: 'Ingresá un nombre para la categoría' })
    .trim()
    .min(1, 'Ingresá un nombre para la categoría')
    .max(50, 'El nombre no puede superar los 50 caracteres'),
});
