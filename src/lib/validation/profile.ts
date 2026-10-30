import { z } from 'zod';
import { userEditFormSchema } from '@/lib/validation/user';

export const profileFormSchema = userEditFormSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export type ProfileFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
  success?: boolean;
  values?: ProfileFormValues;
};
