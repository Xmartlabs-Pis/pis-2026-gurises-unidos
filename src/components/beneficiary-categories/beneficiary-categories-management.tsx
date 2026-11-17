'use client';

import {
  createBeneficiaryCategory,
  deleteBeneficiaryCategory,
  editBeneficiaryCategory,
} from '@/app/actions/beneficiary-categories';
import { NameCatalog } from '@/components/catalog/name-catalog';
import { beneficiaryCategorySchema } from '@/lib/validation/beneficiary-category';

type Category = {
  id: number;
  name: string;
  isSystem: boolean;
  projectCount: number;
};

export function BeneficiaryCategoriesManagement({ categories }: { categories: Category[] }) {
  return (
    <NameCatalog
      items={categories.map((category) => ({
        id: category.id,
        name: category.name,
        projectCount: category.projectCount,
        deletable: !category.isSystem,
      }))}
      title="Categorías"
      placeholder="Nueva categoría..."
      maxLength={50}
      countLabel={(count) => (count === 1 ? '1 categoría' : `${count} categorías`)}
      schema={beneficiaryCategorySchema}
      projectFilter="beneficiaryCategoryId"
      idPrefix="category"
      systemLabel="Sistema"
      actions={{
        create: createBeneficiaryCategory,
        edit: editBeneficiaryCategory,
        delete: deleteBeneficiaryCategory,
      }}
      editTitle="Editar categoría"
      editDescription="Cambiá el nombre de la categoría."
      blockedTitle="No se puede eliminar la categoría"
      blockedDescription="No se puede eliminar una categoría con valores cargados en proyectos."
      deleteTitle="¿Eliminar categoría?"
      deleteDescription={(name) =>
        `Esta acción dejará de mostrar “${name}” en el formulario de proyectos.`
      }
    />
  );
}
