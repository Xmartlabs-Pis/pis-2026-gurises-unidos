import { z } from 'zod';

export const topicSchema = z.object({
  name: z
    .string({ error: 'Ingresá un nombre para la temática' })
    .trim()
    .min(1, 'Ingresá un nombre para la temática')
    .max(30, 'El nombre no puede superar los 30 caracteres'),
});

export type TopicFormData = z.infer<typeof topicSchema>;
