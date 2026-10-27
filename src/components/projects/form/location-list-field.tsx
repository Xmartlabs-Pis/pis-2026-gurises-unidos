'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { ChevronRightIcon, MapPin, PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLocationKey, MAX_PLACE_NAME_LENGTH } from '@/lib/validation/project-form';
import type { ProjectFormValues, ProjectLocationFormValue } from './project-form-values';

const INPUT_CLASS_NAME =
  'border-input bg-background h-9 min-w-0 rounded-lg px-3 text-base md:text-sm';
const LABEL_CLASS_NAME = 'text-foreground text-xs leading-4 font-medium';

function insertLocation(
  locations: ProjectLocationFormValue[],
  location: ProjectLocationFormValue
): ProjectLocationFormValue[] {
  const insertAt =
    locations.findLastIndex(({ departmentId }) => departmentId === location.departmentId) + 1 ||
    locations.length;
  return [...locations.slice(0, insertAt), location, ...locations.slice(insertAt)];
}

export function LocationListField({
  departmentOptions,
}: {
  departmentOptions: readonly { value: string; label: string }[];
}) {
  const { control } = useFormContext<ProjectFormValues>();
  const { field, fieldState } = useController({ name: 'locations', control });
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const locations = field.value;
  const departmentNames = new Map(departmentOptions.map(({ value, label }) => [value, label]));
  const hasCity = city.trim() !== '';
  const errorMessage = draftError ?? fieldState.error?.message;

  function addLocation() {
    if (!departmentId || !hasCity) return;
    const location = {
      departmentId,
      city: city.trim(),
      neighborhood: neighborhood.trim(),
    };
    if (locations.some((item) => getLocationKey(item) === getLocationKey(location))) {
      setDraftError('Esa ubicación ya está agregada');
      return;
    }
    field.onChange(insertLocation(locations, location));
    setDraftError(null);
    setNeighborhood('');
    if (location.neighborhood) {
      neighborhoodRef.current?.focus();
    } else {
      setCity('');
      cityRef.current?.focus();
    }
  }

  function removeLocation(index: number) {
    field.onChange(locations.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addLocation();
  }

  return (
    <Field className="min-w-0 gap-2" data-invalid={Boolean(errorMessage)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <FieldLabel htmlFor="locationDepartment" className={LABEL_CLASS_NAME}>
            Departamento
          </FieldLabel>
          <Select
            items={departmentOptions}
            value={departmentId}
            onValueChange={(value) => {
              setDepartmentId(value);
              setDraftError(null);
            }}
            disabled={departmentOptions.length === 0}
          >
            <SelectTrigger
              id="locationDepartment"
              aria-invalid={Boolean(errorMessage)}
              className="border-input bg-background w-full min-w-0 rounded-lg px-3 text-sm data-[size=default]:h-9"
            >
              <SelectValue placeholder="Seleccionar..." className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent align="start">
              {departmentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <FieldLabel htmlFor="locationCity" className={LABEL_CLASS_NAME}>
            Ciudad
          </FieldLabel>
          <Input
            ref={cityRef}
            id="locationCity"
            value={city}
            placeholder="Ej: Las Piedras"
            disabled={!departmentId}
            aria-required
            maxLength={MAX_PLACE_NAME_LENGTH}
            onChange={(event) => {
              setCity(event.target.value);
              if (!event.target.value.trim()) setNeighborhood('');
              setDraftError(null);
            }}
            onKeyDown={handleKeyDown}
            className={INPUT_CLASS_NAME}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <FieldLabel htmlFor="locationNeighborhood" className={LABEL_CLASS_NAME}>
            Barrio (opcional)
          </FieldLabel>
          <Input
            ref={neighborhoodRef}
            id="locationNeighborhood"
            value={neighborhood}
            placeholder="Ej: Malvín Norte"
            disabled={!hasCity}
            maxLength={MAX_PLACE_NAME_LENGTH}
            onChange={(event) => {
              setNeighborhood(event.target.value);
              setDraftError(null);
            }}
            onKeyDown={handleKeyDown}
            className={INPUT_CLASS_NAME}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={!departmentId || !hasCity}
          onClick={addLocation}
          className="h-9"
        >
          <PlusIcon aria-hidden="true" />
          Agregar
        </Button>
      </div>
      {errorMessage ? (
        <FieldError className="text-xs leading-4">{errorMessage}</FieldError>
      ) : (
        <FieldDescription className="text-muted-foreground text-xs leading-4">
          {departmentId
            ? 'Dejá el barrio vacío para cubrir toda la ciudad'
            : 'Seleccioná un departamento para agregar una ubicación'}
        </FieldDescription>
      )}
      {locations.length > 0 && (
        <ul
          aria-label="Ubicaciones agregadas"
          className="border-border divide-border flex min-w-0 flex-col divide-y rounded-lg border"
        >
          {locations.map((location, index) => {
            const parts = [
              departmentNames.get(location.departmentId) ?? location.departmentId,
              location.city,
              location.neighborhood,
            ].filter(Boolean);
            return (
              <li
                key={getLocationKey(location)}
                className="flex min-w-0 items-center gap-2 py-1.5 pr-1.5 pl-3 text-sm leading-5"
              >
                <MapPin aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1">
                  {parts.map((part, partIndex) => (
                    <span key={partIndex} className="flex min-w-0 items-center gap-x-1">
                      {partIndex > 0 && (
                        <>
                          <ChevronRightIcon
                            aria-hidden="true"
                            className="text-muted-foreground size-3.5 shrink-0"
                          />
                          <span className="sr-only">, </span>
                        </>
                      )}
                      <span
                        className={
                          partIndex === 0
                            ? 'truncate font-medium'
                            : 'text-muted-foreground truncate'
                        }
                      >
                        {part}
                      </span>
                    </span>
                  ))}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLocation(index)}
                  aria-label={`Quitar ${parts.join(', ')}`}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {locations.map((location) => (
        <input
          key={getLocationKey(location)}
          type="hidden"
          name="locations"
          value={JSON.stringify(location)}
        />
      ))}
    </Field>
  );
}
