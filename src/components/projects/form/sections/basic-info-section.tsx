'use client';

import { useEffect, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { STATUS_OPTIONS, COUNTERPARTY_OPTIONS } from '@/lib/project-display';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { SelectField } from '@/components/ui/forms/select-field';
import { FormSection } from '@/components/ui/forms/form-section';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDownIcon } from 'lucide-react';
import type { ProjectFormValues } from '../project-form-values';
import type { SectionProps } from './section-props';

const MAX_STRATEGIC_LINES = 3;

export function BasicInfoSection({
  yearOptions,
  coordinatorOptions,
  topics,
  strategicLines,
}: Pick<SectionProps, 'yearOptions' | 'coordinatorOptions' | 'topics' | 'strategicLines'>) {
  const { control, clearErrors, setValue } = useFormContext<ProjectFormValues>();
  const [isStrategicLinesOpen, setIsStrategicLinesOpen] = useState(false);
  const {
    field: { value: selectedStrategicLineIds = [], onChange: onStrategicLinesChange },
    fieldState: strategicLineFieldState,
  } = useController({ name: 'strategicLineIds', control });
  const strategicLineOptions = strategicLines.map(({ id, name }) => ({
    value: String(id),
    label: name,
  }));
  const status = useWatch<ProjectFormValues, 'status'>({ name: 'status' });
  const startYear = useWatch<ProjectFormValues, 'startYear'>({ name: 'startYear' });
  const endYear = useWatch<ProjectFormValues, 'endYear'>({ name: 'endYear' });
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
        <SelectField
          id="topicId"
          name="topicId"
          label="Temática"
          placeholder="Seleccionar temática..."
          options={topics.map((topic) => ({
            value: String(topic.id),
            label: topic.name,
          }))}
          disabled={topics.length === 0}
          messages={
            topics.length === 0
              ? [
                  'No hay temáticas disponibles. Un administrador debe crear o activar una antes de crear proyectos.',
                ]
              : undefined
          }
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
      />
      <Field className="min-w-0 gap-1.5" data-invalid={Boolean(strategicLineFieldState.error)}>
        <FieldLabel
          htmlFor="strategicLineIds"
          className="text-foreground text-xs leading-4 font-medium"
        >
          Líneas estratégicas
        </FieldLabel>
        <Popover open={isStrategicLinesOpen} onOpenChange={setIsStrategicLinesOpen}>
          <PopoverTrigger
            id="strategicLineIds"
            type="button"
            aria-invalid={Boolean(strategicLineFieldState.error)}
            aria-required="true"
            className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex min-h-9 w-full items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
          >
            <span
              className={`min-w-0 flex-1 text-left leading-5 break-words whitespace-normal ${
                selectedStrategicLineIds.length === 0 ? 'text-muted-foreground' : ''
              }`}
            >
              {selectedStrategicLineIds.length === 0
                ? 'Seleccionar líneas estratégicas...'
                : strategicLineOptions
                    .filter(({ value }) => selectedStrategicLineIds.includes(value))
                    .map(({ label }) => label)
                    .join(', ')}
            </span>
            <ChevronDownIcon className="text-muted-foreground ml-auto size-4 shrink-0" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--anchor-width) p-1">
            {strategicLineOptions.length === 0 ? (
              <p className="text-muted-foreground px-2 py-1.5 text-sm">
                No hay líneas estratégicas disponibles.
              </p>
            ) : (
              <div className="flex max-h-60 flex-col overflow-y-auto">
                {strategicLineOptions.map(({ value, label }) => (
                  <label
                    key={value}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={selectedStrategicLineIds.includes(value)}
                      disabled={
                        selectedStrategicLineIds.length >= MAX_STRATEGIC_LINES &&
                        !selectedStrategicLineIds.includes(value)
                      }
                      onCheckedChange={(checked) => {
                        const nextSelection = checked
                          ? [...selectedStrategicLineIds, value]
                          : selectedStrategicLineIds.filter((id) => id !== value);
                        onStrategicLinesChange(nextSelection);
                        if (checked && nextSelection.length === MAX_STRATEGIC_LINES) {
                          setIsStrategicLinesOpen(false);
                        }
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
            {selectedStrategicLineIds.length >= MAX_STRATEGIC_LINES && (
              <p className="text-muted-foreground px-2 py-1.5 text-xs">
                Podés seleccionar hasta {MAX_STRATEGIC_LINES} líneas estratégicas.
              </p>
            )}
          </PopoverContent>
        </Popover>
        {selectedStrategicLineIds.map((value) => (
          <input key={value} type="hidden" name="strategicLineIds" value={value} />
        ))}
        {strategicLineFieldState.error && (
          <FieldError className="text-xs leading-4">
            {strategicLineFieldState.error.message}
          </FieldError>
        )}
      </Field>
    </FormSection>
  );
}
