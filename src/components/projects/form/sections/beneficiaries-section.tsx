'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DIRECT_CHILDREN_KEY,
  INTENSITY_OPTIONS,
  type BeneficiaryCategoryOption,
} from '@/lib/project-display';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { SelectField } from '@/components/ui/forms/select-field';
import { FormSection } from '@/components/ui/forms/form-section';
import { IntensityInfo } from '../intensity-info';
import type { ProjectFormValues } from '../project-form-values';
import type { SectionProps } from './section-props';

const VISIBLE_BENEFICIARY_FIELDS = 10;

function BeneficiaryField({
  category,
  className,
}: {
  category: BeneficiaryCategoryOption;
  className?: string;
}) {
  return (
    <TextInputField
      id={category.key}
      name={category.key}
      label={category.name}
      type="text"
      inputMode="numeric"
      className={className}
    />
  );
}

function BeneficiaryFields({ categories }: { categories: BeneficiaryCategoryOption[] }) {
  return categories.map((category, index) => (
    <BeneficiaryField
      key={category.key}
      category={category}
      className={cn(
        'sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:*:data-[slot=field-label]:self-end',
        index === categories.length - 1 && index % 2 === 0 && 'sm:col-span-2'
      )}
    />
  ));
}

export function BeneficiariesSection({
  isEditing,
  yearOptions,
  beneficiaryRecords,
  beneficiaryCategories,
}: Pick<
  SectionProps,
  'isEditing' | 'yearOptions' | 'beneficiaryRecords' | 'beneficiaryCategories'
>) {
  const { getValues, setValue } = useFormContext<ProjectFormValues>();

  const startYear = useWatch({ name: 'startYear' });
  const status = useWatch({ name: 'status' });
  const endYear = useWatch({ name: 'endYear' });
  const year = useWatch({ name: 'year' });
  const drafts = useWatch<ProjectFormValues, 'beneficiaryDrafts'>({ name: 'beneficiaryDrafts' });
  const intensity = useWatch<ProjectFormValues, 'intensity'>({ name: 'intensity' });
  const directChildren = useWatch({ name: DIRECT_CHILDREN_KEY });
  const hasDirectChildren =
    Number(directChildren) > 0 ||
    drafts.some((draft) => Number(draft[DIRECT_CHILDREN_KEY]) > 0) ||
    beneficiaryRecords.some(
      (record) =>
        String(record.year) !== year &&
        !drafts.some((draft) => draft.year === String(record.year)) &&
        record[DIRECT_CHILDREN_KEY] > 0
    );

  const directChildrenCategory = beneficiaryCategories.find(
    ({ key }) => key === DIRECT_CHILDREN_KEY
  );
  const otherCategories = beneficiaryCategories.filter(({ key }) => key !== DIRECT_CHILDREN_KEY);
  const visibleCategories = otherCategories.slice(0, VISIBLE_BENEFICIARY_FIELDS - 1);
  const extraCategories = otherCategories.slice(VISIBLE_BENEFICIARY_FIELDS - 1);
  const extraKeys = extraCategories.map(({ key }) => key);
  const formValues = useWatch<ProjectFormValues>();
  const { errors } = useFormState<ProjectFormValues>();
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const hasExtraValues = extraKeys.some((key) => Number(formValues[key]) > 0);
  const hasExtraErrors = extraKeys.some((key) => errors[key]);
  const open = hasExtraErrors || (userOpen ?? hasExtraValues);
  const invalidDraftYears = drafts
    .filter((_, index) => errors.beneficiaryDrafts?.[index])
    .map((draft) => draft.year);
  const draftsError =
    errors.beneficiaryDrafts?.message ??
    (invalidDraftYears.length > 0
      ? `Revisá los beneficiarios de ${invalidDraftYears.join(', ')}`
      : undefined);

  const selectYear = useCallback(
    (beneficiaryYear: string) => {
      const current = getValues();
      if (beneficiaryYear === current.year) return;
      const currentRecord = beneficiaryRecords.find((item) => String(item.year) === current.year);
      const record = beneficiaryRecords.find((item) => String(item.year) === beneficiaryYear);
      const draft = current.beneficiaryDrafts.find((item) => item.year === beneficiaryYear);
      const nextDrafts = current.beneficiaryDrafts.filter((item) => item !== draft);
      if (
        beneficiaryCategories.some(
          ({ key }) => Number(current[key]) !== (currentRecord?.[key] ?? 0)
        )
      ) {
        nextDrafts.push({
          year: current.year,
          ...Object.fromEntries(beneficiaryCategories.map(({ key }) => [key, current[key]])),
        });
      }
      for (const { key } of beneficiaryCategories) {
        setValue(key, String(draft?.[key] ?? record?.[key] ?? 0), { shouldValidate: true });
      }
      setValue('year', beneficiaryYear);
      setValue('beneficiaryDrafts', nextDrafts, { shouldValidate: true });
    },
    [getValues, setValue, beneficiaryRecords, beneficiaryCategories]
  );

  useEffect(() => {
    if (!hasDirectChildren && intensity) {
      setValue('intensity', '', { shouldValidate: true });
    }
  }, [hasDirectChildren, intensity, setValue]);

  useEffect(() => {
    if (!startYear || !year) return;
    if (Number(year) < Number(startYear)) {
      selectYear(startYear);
      return;
    }
    if (
      status === 'inactive' &&
      endYear &&
      Number(endYear) >= Number(startYear) &&
      Number(year) > Number(endYear)
    ) {
      selectYear(endYear);
    }
  }, [startYear, status, endYear, year, selectYear]);

  useEffect(() => {
    const currentDrafts = getValues('beneficiaryDrafts');
    const nextDrafts = currentDrafts.filter((draft) =>
      yearOptions.some(({ value }) => value === draft.year)
    );
    if (nextDrafts.length < currentDrafts.length) {
      setValue('beneficiaryDrafts', nextDrafts, { shouldValidate: true });
    }
  }, [drafts, yearOptions, getValues, setValue]);

  return (
    <FormSection
      title="Beneficiarios principales"
      descriptionSpacing={isEditing ? 'relaxed' : 'compact'}
      description="Estas categorías son el núcleo del impacto. Completá lo que aplica."
      contentClassName="grid grid-cols-1 content-start gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <SelectField
          id="year"
          name="year"
          label="Año de beneficiarios"
          options={yearOptions}
          onValueChange={selectYear}
          description="Al guardar se aplican los cambios de todos los años."
          messages={draftsError ? [draftsError] : undefined}
        />
        {drafts.map((draft) => (
          <input
            key={draft.year}
            type="hidden"
            name="beneficiaryDrafts"
            value={JSON.stringify(draft)}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 sm:col-span-2 sm:grid-cols-2">
        {directChildrenCategory && <BeneficiaryField category={directChildrenCategory} />}
        <SelectField
          id="intensity"
          name="intensity"
          label="Intensidad"
          labelAddon={<IntensityInfo />}
          placeholder="Seleccionar intensidad..."
          options={INTENSITY_OPTIONS}
          disabled={!hasDirectChildren}
          required={hasDirectChildren}
          description={
            hasDirectChildren ? undefined : 'Disponible al cargar al menos un NNA directo.'
          }
        />
      </div>
      <BeneficiaryFields categories={visibleCategories} />
      {extraCategories.length > 0 && (
        <Collapsible open={open} onOpenChange={setUserOpen} className="sm:col-span-2">
          <CollapsibleContent keepMounted>
            <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
              <BeneficiaryFields categories={extraCategories} />
            </div>
          </CollapsibleContent>
          <CollapsibleTrigger
            render={
              <Button type="button" variant="ghost" className="text-muted-foreground w-full" />
            }
          >
            {open
              ? 'Mostrar menos'
              : `Mostrar ${extraCategories.length} ${extraCategories.length === 1 ? 'categoría' : 'categorías'} más`}
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </FormSection>
  );
}
