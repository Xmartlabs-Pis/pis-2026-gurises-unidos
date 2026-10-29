import type { BeneficiaryFieldName } from '@/lib/project-display';
import type { ProjectFormData } from '@/lib/validation/project-form';

type ProjectFormListField = 'topicIds' | 'strategicLineIds' | 'countries';

export type ProjectLocationFormValue = {
  departmentId: string;
  city: string;
  neighborhood: string;
};

export type ProjectFormValues = Omit<
  { [K in keyof ProjectFormData]: string },
  ProjectFormListField | 'locations'
> & {
  coverPhotoUrl: string | null;
  locations: ProjectLocationFormValue[];
} & { [K in ProjectFormListField]: string[] } & {
  [K in BeneficiaryFieldName]?: string;
};
