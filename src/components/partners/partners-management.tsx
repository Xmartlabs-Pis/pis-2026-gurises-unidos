'use client';

import { createPartner, deletePartner, editPartner } from '@/app/actions/partners';
import { NameCatalog } from '@/components/catalog/name-catalog';
import { COUNTERPARTY_LABEL } from '@/lib/project-display';
import { partnerSchema } from '@/lib/validation/partner';
import type { CounterpartyType } from '@/generated/prisma/enums';
import { PartnerTypeField } from './partner-type-field';

type Partner = {
  id: number;
  name: string;
  counterpartyType: CounterpartyType;
  _count: {
    projects: number;
  };
};

export function PartnersManagement({ partners }: { partners: Partner[] }) {
  return (
    <NameCatalog
      items={partners.map((partner) => ({
        ...partner,
        projectCount: partner._count.projects,
      }))}
      title="Socios de proyectos"
      placeholder="Nuevo socio..."
      maxLength={100}
      nameAriaLabel="Nombre del socio"
      formClassName="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      countLabel={(count) => (count === 1 ? '1 socio' : `${count} socios`)}
      schema={partnerSchema}
      projectFilter="partnerId"
      idPrefix="partner"
      actions={{ create: createPartner, edit: editPartner, delete: deletePartner }}
      editTitle="Editar socio"
      editDescription="Cambiá el nombre o el tipo de contraparte del socio."
      blockedTitle="No se puede eliminar el socio"
      blockedDescription="No se puede eliminar un socio asociado a proyectos."
      deleteTitle="¿Eliminar socio?"
      deleteDescription={(name) => `Esta acción dejará de mostrar “${name}” como socio.`}
      createFields={<PartnerTypeField variant="create" />}
      editFields={(partner, pending) => (
        <PartnerTypeField
          variant="edit"
          disabled={pending}
          {...(partner.projectCount > 0
            ? { lockedValue: partner.counterpartyType }
            : { initialValue: partner.counterpartyType })}
        />
      )}
      renderLabel={(partner) => (
        <div className="min-w-0">
          <span
            lang="es"
            className="text-foreground block text-sm leading-5 font-medium break-words hyphens-auto"
          >
            {partner.name}
          </span>
          <span className="text-muted-foreground block text-xs leading-4">
            {COUNTERPARTY_LABEL[partner.counterpartyType]}
          </span>
        </div>
      )}
    />
  );
}
