import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El correo es obligatorio.')
  .max(254, 'El correo no puede superar los 254 caracteres.')
  .pipe(z.email({ error: 'Ingresá un correo electrónico válido.' }));
