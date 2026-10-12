'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { INTENSITY_OPTIONS, type BeneficiaryCategoryOption } from '@/lib/project-display';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { SelectField } from '@/components/ui/forms/select-field';
import { FormSection } from '@/components/ui/forms/form-section';
import type { ProjectFormValues } from '../project-form-values';
import type { SectionProps } from './section-props';

const VISIBLE_BENEFICIARY_FIELDS = 10;

function BeneficiaryFields({ categories }: { categories: BeneficiaryCategoryOption[] }) {
  return categories.map((field, index) => (
    <TextInputField
      key={field.key}
      id={field.key}
      name={field.key}
      label={field.name}
      type="text"
      inputMode="numeric"
      className={index === categories.length - 1 && index % 2 === 0 ? 'sm:col-span-2' : undefined}
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
  const beneficiaryDrafts = useRef<Record<string, Partial<ProjectFormValues>>>({});

  const startYear = useWatch({ name: 'startYear' });
  const status = useWatch({ name: 'status' });
  const endYear = useWatch({ name: 'endYear' });
  const year = useWatch({ name: 'year' });
  const intensity = useWatch<ProjectFormValues, 'intensity'>({ name: 'intensity' });
  const directChildren = useWatch<ProjectFormValues, 'directChildrenAdolescents'>({
    name: 'directChildrenAdolescents',
  });
  const hasDirectChildren = Number(directChildren) > 0;

  const visibleCategories = beneficiaryCategories.slice(0, VISIBLE_BENEFICIARY_FIELDS);
  const extraCategories = beneficiaryCategories.slice(VISIBLE_BENEFICIARY_FIELDS);
  const extraKeys = extraCategories.map(({ key }) => key);
  const formValues = useWatch<ProjectFormValues>();
  const { errors } = useFormState<ProjectFormValues>();
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const hasExtraValues = extraKeys.some((key) => Number(formValues[key]) > 0);
  const hasExtraErrors = extraKeys.some((key) => errors[key]);
  const open = hasExtraErrors || (userOpen ?? hasExtraValues);

  // TODO: Implement multiple years support on the backend
  // right now we only support one year
  const selectYear = useCallback(
    (beneficiaryYear: string) => {
      const current = getValues();
      beneficiaryDrafts.current[current.year] = Object.fromEntries(
        beneficiaryCategories.map(({ key }) => [key, current[key]])
      );
      const record = beneficiaryRecords.find((item) => String(item.year) === beneficiaryYear);
      const counts = Object.fromEntries(
        beneficiaryCategories.map(({ key }) => [key, String(record?.[key] ?? 0)])
      );
      const nextCounts: Partial<Record<string, string | null>> = {
        ...counts,
        ...beneficiaryDrafts.current[beneficiaryYear],
      };
      for (const { key } of beneficiaryCategories) {
        setValue(key, String(nextCounts[key] ?? '0'), { shouldValidate: true });
      }
      setValue('year', beneficiaryYear);
    },
    [getValues, setValue, beneficiaryRecords, beneficiaryCategories]
  );

  useEffect(() => {
    if (!startYear || !year) return;
    if (Number(year) < Number(startYear)) {
      selectYear(startYear);
      return;
    }
    if (
      status === 'closed' &&
      endYear &&
      Number(endYear) >= Number(startYear) &&
      Number(year) > Number(endYear)
    ) {
      selectYear(endYear);
    }
  }, [startYear, status, endYear, year, selectYear]);

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
        />
        <p className="text-muted-foreground mt-2 text-xs">
          Se guardan únicamente los beneficiarios del año seleccionado. Los cambios de otros años no
          se guardarán al salir.
        </p>
      </div>
      <div className="sm:col-span-2">
        <SelectField
          id="intensity"
          name="intensity"
          label="Intensidad"
          options={INTENSITY_OPTIONS}
          disabled={!hasDirectChildren}
          description={
            hasDirectChildren ? undefined : 'Disponible al cargar al menos un NNA directo.'
          }
        />
        {!hasDirectChildren && <input type="hidden" name="intensity" value={intensity} />}
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
