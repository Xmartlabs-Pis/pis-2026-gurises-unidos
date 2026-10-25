'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { STATUS_OPTIONS, COUNTERPARTY_OPTIONS } from '@/lib/project-display';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { MultiSelectField } from '@/components/ui/forms/multi-select-field';
import { SelectField } from '@/components/ui/forms/select-field';
import { FormSection } from '@/components/ui/forms/form-section';
import { MAX_STRATEGIC_LINES } from '@/lib/validation/project-form';
import type { ProjectFormValues } from '../project-form-values';
import type { SectionProps } from './section-props';

export function BasicInfoSection({
  yearOptions,
  coordinatorOptions,
  canSelectCoordinator,
  topics,
  strategicLines,
}: Pick<
  SectionProps,
  'yearOptions' | 'coordinatorOptions' | 'canSelectCoordinator' | 'topics' | 'strategicLines'
>) {
  const { clearErrors, setValue } = useFormContext<ProjectFormValues>();
  const strategicLineOptions = strategicLines.map(({ id, name }) => ({
    value: String(id),
    label: name,
  }));
  const status = useWatch<ProjectFormValues, 'status'>({ name: 'status' });
  const startYear = useWatch<ProjectFormValues, 'startYear'>({ name: 'startYear' });
  const endYear = useWatch<ProjectFormValues, 'endYear'>({ name: 'endYear' });
  const leadCoordinatorId = useWatch<ProjectFormValues, 'leadCoordinatorId'>({
    name: 'leadCoordinatorId',
  });
  const startYearOptions = yearOptions.filter(
    ({ value }) => status !== 'inactive' || !endYear || Number(value) <= Number(endYear)
  );
  const endYearOptions = yearOptions.filter(
    ({ value }) => !startYear || Number(value) >= Number(startYear)
  );

  useEffect(() => {
    if (status === 'inactive' && startYear && endYear && Number(endYear) < Number(startYear)) {
      setValue('endYear', '', { shouldValidate: true });
    }
  }, [status, startYear, endYear, setValue]);

  return (
    <FormSection title="Información básica">
      <TextInputField
        maxLength={100}
        id="name"
        name="name"
        label="Nombre del proyecto"
        placeholder="Ej: Espacio joven Malvín Norte"
        description="Nombre de fantasía — puede cambiarse después"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="status"
          name="status"
          label="Estado"
          options={STATUS_OPTIONS}
          onValueChange={(value) => {
            if (value !== 'inactive') {
              setValue('endYear', '');
              clearErrors('endYear');
            }
          }}
        />
        <MultiSelectField
          id="topicIds"
          name="topicIds"
          label="Temáticas"
          placeholder="Seleccionar temáticas..."
          options={topics.map((topic) => ({
            value: String(topic.id),
            label: topic.name,
          }))}
          emptyMessage="No hay temáticas disponibles. Un administrador debe crear o activar una antes de crear proyectos."
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="startYear"
          name="startYear"
          label="Año de inicio"
          options={startYearOptions}
        />
        <SelectField
          id="endYear"
          name="endYear"
          label="Año de fin"
          placeholder="Seleccionar..."
          clearLabel="Sin año de fin"
          options={endYearOptions}
          disabled={status !== 'inactive'}
          required={status === 'inactive'}
        />
      </div>
      <SelectField
        id="counterpartyType"
        name="counterpartyType"
        label="Contraparte"
        placeholder="Seleccionar contraparte..."
        options={COUNTERPARTY_OPTIONS}
        required
      />
      <SelectField
        id="leadCoordinatorId"
        name="leadCoordinatorId"
        label="Coordinador responsable"
        placeholder="Seleccionar coordinador..."
        options={coordinatorOptions}
        disabled={!canSelectCoordinator}
      />
      {!canSelectCoordinator && (
        <input type="hidden" name="leadCoordinatorId" value={leadCoordinatorId ?? ''} />
      )}
      <MultiSelectField
        id="strategicLineIds"
        name="strategicLineIds"
        label="Líneas Estratégicas"
        placeholder="Seleccionar líneas estratégicas..."
        options={strategicLineOptions}
        emptyMessage="No hay líneas estratégicas disponibles."
        maxSelected={MAX_STRATEGIC_LINES}
        maxSelectedMessage={`Podés seleccionar hasta ${MAX_STRATEGIC_LINES} líneas estratégicas.`}
        required
      />
    </FormSection>
  );
}
