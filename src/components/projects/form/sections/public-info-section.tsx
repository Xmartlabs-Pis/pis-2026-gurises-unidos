import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { TextareaField } from '@/components/ui/forms/textarea-field';
import { FormSection } from '@/components/ui/forms/form-section';

export function PublicInfoSection() {
  return (
    <FormSection
      title="Información pública"
      description="Aparece en la vista pública para donantes y aliados."
    >
      <TextInputField
        id="generalObjective"
        name="generalObjective"
        label="Objetivo general"
        placeholder="Ej: Acompañando a jóvenes en situación de vulnerabilidad"
        description="Aparece como subtítulo en la vista pública"
      />
      <TextareaField
        id="publicDescription"
        name="publicDescription"
        label="Descripción pública"
        placeholder="Contá de qué trata el proyecto, a quiénes ayuda y cuál es su impacto..."
        description="Máx. 1000 caracteres"
      />
      <Field hidden>
        <FieldLabel htmlFor="coverPhoto">Foto de portada</FieldLabel>
        <input
          id="coverPhoto"
          type="file"
          disabled
          aria-describedby="cover-photo-description"
          className="text-muted-foreground text-sm"
        />
        <FieldDescription id="cover-photo-description">
          La carga de portada está pendiente. La imagen existente se conserva y se muestra en la
          vista previa.
        </FieldDescription>
      </Field>
    </FormSection>
  );
}
