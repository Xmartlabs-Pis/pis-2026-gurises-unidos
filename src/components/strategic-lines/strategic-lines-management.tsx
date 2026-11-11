'use client';

import {
  createStrategicLine,
  deleteStrategicLine,
  editStrategicLine,
} from '@/app/actions/strategic-lines';
import { NameCatalog } from '@/components/catalog/name-catalog';
import { strategicLineSchema } from '@/lib/validation/strategic-line';

type StrategicLine = {
  id: number;
  name: string;
  _count: {
    projects: number;
  };
};

export function StrategicLinesManagement({ lines }: { lines: StrategicLine[] }) {
  return (
    <NameCatalog
      items={lines.map((line) => ({
        id: line.id,
        name: line.name,
        projectCount: line._count.projects,
      }))}
      title="Líneas Estratégicas de proyectos"
      placeholder="Nueva línea estratégica..."
      maxLength={100}
      countLabel={(count) => (count === 1 ? '1 línea estratégica' : `${count} líneas estratégicas`)}
      schema={strategicLineSchema}
      projectFilter="strategicLineId"
      idPrefix="strategic-line"
      actions={{
        create: createStrategicLine,
        edit: editStrategicLine,
        delete: deleteStrategicLine,
      }}
      editTitle="Editar línea estratégica"
      editDescription="Cambiá el nombre de la línea estratégica."
      blockedTitle="No se puede eliminar la línea estratégica"
      blockedDescription="No se puede eliminar una línea estratégica asociada a proyectos."
      deleteTitle="¿Eliminar línea estratégica?"
      deleteDescription={(name) =>
        `Esta acción dejará de mostrar “${name}” como línea estratégica.`
      }
    />
  );
}
