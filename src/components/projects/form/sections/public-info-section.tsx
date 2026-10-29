import { ImageUploadField } from '@/components/ui/forms/image-upload-field';
import { TextareaField } from '@/components/ui/forms/textarea-field';
import { FormSection } from '@/components/ui/forms/form-section';

export function PublicInfoSection({
  coverFile,
  imageUrl,
  onCoverFileChange,
  onRemoveSavedCover,
}: {
  coverFile: File | null;
  imageUrl: string | null;
  onCoverFileChange: (file: File | null) => void;
  onRemoveSavedCover?: () => void;
}) {
  return (
    <FormSection
      title="Información pública"
      description="Aparece en la vista pública para donantes y aliados."
    >
      <TextareaField
        id="generalObjective"
        name="generalObjective"
        label="Objetivo general"
        placeholder="Ej: Acompañando a jóvenes en situación de vulnerabilidad"
        description="Aparece como subtítulo en la vista pública"
        className="min-h-9"
      />
      <TextareaField
        id="publicDescription"
        name="publicDescription"
        label="Descripción pública"
        placeholder="Contá de qué trata el proyecto, a quiénes ayuda y cuál es su impacto..."
        description="Máx. 1000 caracteres"
      />
      <ImageUploadField
        id="coverPhoto"
        label="Foto de portada"
        value={coverFile}
        imageUrl={imageUrl}
        onValueChange={onCoverFileChange}
        onRemoveSaved={onRemoveSavedCover}
      />
    </FormSection>
  );
}
