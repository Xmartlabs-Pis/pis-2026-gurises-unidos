'use client';

import { createTopic, deleteTopic, editTopic } from '@/app/actions/topics';
import { NameCatalog } from '@/components/catalog/name-catalog';
import { topicSchema } from '@/lib/validation/topic';

type Topic = {
  id: number;
  name: string;
  _count: {
    projects: number;
  };
};

export function TopicsManagement({ topics }: { topics: Topic[] }) {
  return (
    <NameCatalog
      items={topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        projectCount: topic._count.projects,
      }))}
      title="Temáticas de proyectos"
      placeholder="Nueva temática..."
      maxLength={30}
      countLabel={(count) => (count === 1 ? '1 temática' : `${count} temáticas`)}
      schema={topicSchema}
      projectFilter="topicId"
      idPrefix="topic"
      actions={{ create: createTopic, edit: editTopic, delete: deleteTopic }}
      editTitle="Editar temática"
      editDescription="Cambiá el nombre de la temática."
      blockedTitle="No se puede eliminar la temática"
      blockedDescription="No se puede eliminar una temática con proyectos asociados."
      deleteTitle="¿Eliminar temática?"
      deleteDescription={(name) =>
        `Esta acción dejará de mostrar “${name}” como temática disponible.`
      }
    />
  );
}
