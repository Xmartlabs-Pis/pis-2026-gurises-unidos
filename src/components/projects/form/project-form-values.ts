import type { BeneficiaryFieldName } from '@/lib/project-display';
import type { ProjectFormData } from '@/lib/validation/project-form';

export type ProjectFormValues = Omit<
  { [K in keyof ProjectFormData]: string },
  'strategicLineIds'
> & {
  coverPhotoUrl: string | null;
  strategicLineIds: string[];
} & {
  [K in BeneficiaryFieldName]?: string;
};
