'use client';

import { useController, useFormContext, useWatch } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GEOGRAPHIC_SCOPE_OPTIONS } from '@/lib/project-display';
import { MAX_PLACE_NAME_LENGTH } from '@/lib/validation/project-form';
import { TagInputField } from '@/components/ui/forms/tag-input-field';
import { FormSection } from '@/components/ui/forms/form-section';
import { LocationListField } from '../location-list-field';
import type { ProjectFormValues } from '../project-form-values';
import type { SectionProps } from './section-props';

function PillRadioField({
  name,
  label,
  options,
  onValueChange,
}: {
  name: 'geographicScope';
  label: string;
  options: readonly { value: string; label: string }[];
  onValueChange?: (value: string) => void;
}) {
  const { control } = useFormContext<ProjectFormValues>();
  const { field, fieldState } = useController({ name, control });
  const labelId = `${name}-label`;

  return (
    <Field className="min-w-0 gap-1.5">
      <FieldLabel id={labelId} className="text-foreground text-xs leading-4 font-medium">
        {label}
      </FieldLabel>
      <RadioGroup
        name={name}
        aria-labelledby={labelId}
        aria-invalid={Boolean(fieldState.error)}
        value={field.value}
        onValueChange={(value) => {
          field.onChange(value);
          onValueChange?.(String(value));
        }}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Label
            key={option.value}
            className="bg-muted text-secondary-foreground has-data-checked:bg-primary has-data-checked:text-primary-foreground has-[:focus-visible]:ring-ring relative h-[22px] cursor-pointer rounded-full px-2.5 text-xs leading-4 font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2"
          >
            <RadioGroupItem
              value={option.value}
              aria-label={option.label}
              className="absolute inset-0 size-full border-0 opacity-0"
            />
            <span>{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
      <FieldError className="text-xs leading-4">{fieldState.error?.message}</FieldError>
    </Field>
  );
}

export function TerritorySection({
  isEditing,
  departmentOptions,
  coverageLabel,
}: Pick<SectionProps, 'isEditing' | 'departmentOptions' | 'coverageLabel'>) {
  const { clearErrors } = useFormContext<ProjectFormValues>();
  const geographicScope = useWatch<ProjectFormValues, 'geographicScope'>({
    name: 'geographicScope',
  });
  const isInternational = geographicScope === 'international';

  return (
    <FormSection
      title="Territorio"
      description="¿En qué zonas opera este proyecto?"
      descriptionSpacing={isEditing ? 'relaxed' : 'compact'}
    >
      <PillRadioField
        name="geographicScope"
        label="Alcance geográfico"
        options={GEOGRAPHIC_SCOPE_OPTIONS}
        onValueChange={() => clearErrors(['locations', 'countries'])}
      />
      {isInternational ? (
        <TagInputField
          id="countries"
          name="countries"
          label="Países"
          placeholder="Ej: Argentina"
          description="Escribí un país y presioná Enter para agregarlo"
          maxLength={MAX_PLACE_NAME_LENGTH}
        />
      ) : (
        <LocationListField departmentOptions={departmentOptions} />
      )}
      {isEditing && (
        <div className="bg-muted rounded-[10px] px-3.5 py-3">
          <p className="text-muted-foreground text-sm leading-5">Cobertura</p>
          <p className="mt-1 flex items-center gap-1 text-sm leading-5">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {coverageLabel || (isInternational ? 'Ingresá un país' : 'Seleccioná un departamento')}
          </p>
        </div>
      )}
    </FormSection>
  );
}
