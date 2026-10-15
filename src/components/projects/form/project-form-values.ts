import type { BeneficiaryFieldName } from '@/lib/project-display';
import type { ProjectFormData } from '@/lib/validation/project-form';

type ProjectFormListField =
  'topicIds' | 'strategicLineIds' | 'departmentIds' | 'countries' | 'cities' | 'neighborhoods';

export type ProjectFormValues = Omit<
  { [K in keyof ProjectFormData]: string },
  ProjectFormListField
> & {
  coverPhotoUrl: string | null;
} & { [K in ProjectFormListField]: string[] } & {
  [K in BeneficiaryFieldName]?: string;
};
