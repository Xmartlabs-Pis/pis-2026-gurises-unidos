import type { BeneficiaryCategoryOption, BeneficiaryCounts } from '@/lib/project-display';

export type SectionProps = {
  isEditing: boolean;
  yearOptions: { value: string; label: string }[];
  coordinatorOptions: { value: string; label: string }[];
  departmentOptions: { value: string; label: string }[];
  topics: { id: number; name: string }[];
  strategicLines: { id: number; name: string }[];
  coverageLabel: string;
  beneficiaryRecords: (BeneficiaryCounts & { year: number })[];
  beneficiaryCategories: BeneficiaryCategoryOption[];
};
