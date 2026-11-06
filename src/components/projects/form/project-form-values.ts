import type { BeneficiaryFieldName } from '@/lib/project-display';
import type { CoverCrop } from '@/lib/projects/cover-crop';
import type { ProjectFormData } from '@/lib/validation/project-form';

type ProjectFormListField = 'topicIds' | 'strategicLineIds' | 'countries';

export type ProjectLocationFormValue = {
  departmentId: string;
  city: string;
  neighborhood: string;
};

export type BeneficiaryYearDraft = { year: string } & { [K in BeneficiaryFieldName]?: string };

export type ProjectFormValues = Omit<
  { [K in keyof ProjectFormData]: string },
  ProjectFormListField | 'locations' | 'beneficiaryDrafts'
> & {
  coverPhotoUrl: string | null;
  coverCrop: CoverCrop | null;
  locations: ProjectLocationFormValue[];
  beneficiaryDrafts: BeneficiaryYearDraft[];
} & { [K in ProjectFormListField]: string[] } & {
  [K in BeneficiaryFieldName]?: string;
};
