'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { STATUS_OPTIONS, COUNTERPARTY_OPTIONS } from '@/lib/project-display';
import { TextareaField } from '@/components/ui/forms/textarea-field';
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
  partners,
}: Pick<
  SectionProps,
  | 'yearOptions'
  | 'coordinatorOptions'
  | 'canSelectCoordinator'
  | 'topics'
  | 'strategicLines'
  | 'partners'
>) {
  const { clearErrors, getValues, setValue } = useFormContext<ProjectFormValues>();
  const strategicLineOptions = strategicLines.map(({ id, name }) => ({
    value: String(id),
    label: name,
  }));
  const counterpartyTypes = useWatch<ProjectFormValues, 'counterpartyTypes'>({
    name: 'counterpartyTypes',
  });
  const partnerOptions = partners
    .filter(({ counterpartyType }) => counterpartyTypes.includes(counterpartyType))
    .map(({ id, name }) => ({ value: String(id), label: name }));
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

  function removePartnersOutside(selectedTypes: string[]) {
    const allowedIds = partners
      .filter(({ counterpartyType }) => selectedTypes.includes(counterpartyType))
      .map(({ id }) => String(id));
    setValue(
      'partnerIds',
      getValues('partnerIds').filter((id) => allowedIds.includes(id))
    );
  }

  useEffect(() => {
    if (status === 'inactive' && startYear && endYear && Number(endYear) < Number(startYear)) {
      setValue('endYear', '', { shouldValidate: true });
    }
  }, [status, startYear, endYear, setValue]);

  return (
    <FormSection title="Información básica">
      <TextareaField
        maxLength={100}
        id="name"
        name="name"
        label="Nombre del proyecto"
        placeholder="Ej: Espacio joven Malvín Norte"
        description="Nombre de fantasía — puede cambiarse después"
        className="min-h-9"
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
      <MultiSelectField
        id="counterpartyTypes"
        name="counterpartyTypes"
        label="Contrapartes"
        placeholder="Seleccionar contrapartes..."
        options={COUNTERPARTY_OPTIONS}
        onValueChange={removePartnersOutside}
        required
      />
      <MultiSelectField
        id="partnerIds"
        name="partnerIds"
        label="Socios"
        placeholder="Seleccionar socios..."
        options={partnerOptions}
        emptyMessage={
          counterpartyTypes.length
            ? 'No hay socios de las contrapartes seleccionadas.'
            : 'Seleccioná una contraparte para ver sus socios.'
        }
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
