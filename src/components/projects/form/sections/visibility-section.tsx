import { Controller, useFormContext } from 'react-hook-form';
import { FormSection } from '@/components/ui/forms/form-section';
import { Switch } from '@/components/ui/switch';
import type { ProjectFormValues } from '../project-form-values';

export function VisibilitySection() {
  const { control } = useFormContext<ProjectFormValues>();

  return (
    <FormSection
      title="Visibilidad"
      description="Define si el proyecto se muestra a usuarios externos en la vista pública."
    >
      <Controller
        control={control}
        name="showOnLanding"
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <Switch
              id="showOnLanding"
              checked={field.value === 'true'}
              onCheckedChange={(checked) => field.onChange(String(checked))}
            />
            <label htmlFor="showOnLanding" className="cursor-pointer text-sm">
              Mostrar en la vista pública
            </label>
            <input type="hidden" name="showOnLanding" value={field.value} />
          </div>
        )}
      />
    </FormSection>
  );
}
