import { TextareaField } from '@/components/ui/forms/textarea-field';
import { FormSection } from '@/components/ui/forms/form-section';
import type { SectionProps } from './section-props';

export function InternalNotesSection({ isEditing }: Pick<SectionProps, 'isEditing'>) {
  return (
    <FormSection
      title="Notas internas"
      description="Comentarios para el equipo. No se muestran en la vista pública."
      separator={!isEditing}
      descriptionClassName={isEditing ? 'text-muted-foreground text-sm leading-5' : undefined}
      contentClassName={isEditing ? 'pt-4' : 'pt-3'}
    >
      <TextareaField
        id="internalNotes"
        name="internalNotes"
        label="Notas internas"
        placeholder="Escribí un comentario para el equipo…"
      />
    </FormSection>
  );
}
