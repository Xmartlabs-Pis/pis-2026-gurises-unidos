import { TextareaField } from '@/components/ui/forms/textarea-field';
import { FormSection } from '@/components/ui/forms/form-section';
import type { CoverCrop } from '@/lib/projects/cover-crop';
import { CoverPhotoField } from '../cover-photo-field';
import type { CoverDraft } from '../use-project-cover';

export function PublicInfoSection({
  previewUrl,
  crop,
  file,
  canRemoveSaved,
  hasUnsavedSelection,
  hasUnsavedCrop,
  onApplyCover,
  onClearUnsavedCover,
  onRemoveSavedCover,
}: {
  previewUrl: string | null;
  crop: CoverCrop | null;
  file: File | null;
  canRemoveSaved: boolean;
  hasUnsavedSelection: boolean;
  hasUnsavedCrop: boolean;
  onApplyCover: (draft: CoverDraft) => void;
  onClearUnsavedCover: () => void;
  onRemoveSavedCover?: () => void;
}) {
  return (
    <FormSection
      title="Información pública"
      description="Aparece en el reporte público para donantes y aliados."
    >
      <TextareaField
        id="generalObjective"
        name="generalObjective"
        label="Objetivo general"
        placeholder="Ej: Acompañando a jóvenes en situación de vulnerabilidad"
        description="Aparece como subtítulo en el reporte público"
        className="min-h-9"
      />
      <TextareaField
        id="publicDescription"
        name="publicDescription"
        label="Descripción pública"
        placeholder="Contá de qué trata el proyecto, a quiénes ayuda y cuál es su impacto..."
        description="Máx. 1000 caracteres"
      />
      <CoverPhotoField
        previewUrl={previewUrl}
        crop={crop}
        file={file}
        canRemoveSaved={canRemoveSaved}
        hasUnsavedSelection={hasUnsavedSelection}
        hasUnsavedCrop={hasUnsavedCrop}
        onApply={onApplyCover}
        onClearUnsaved={onClearUnsavedCover}
        onRemoveSaved={onRemoveSavedCover}
      />
    </FormSection>
  );
}
