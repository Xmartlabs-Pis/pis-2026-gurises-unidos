'use client';

import { useActionState, useState } from 'react';
import {
  createPartner,
  deletePartner,
  editPartner,
  type PartnerActionState,
} from '@/app/actions/partners';
import { ProjectCountLink } from '@/components/project-count-link';
import { COUNTERPARTY_LABEL, COUNTERPARTY_OPTIONS } from '@/lib/project-display';
import { partnerSchema } from '@/lib/validation/partner';
import type { CounterpartyType } from '@/generated/prisma/enums';
import { MoreHorizontal } from 'lucide-react';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

type Partner = {
  id: number;
  name: string;
  counterpartyType: CounterpartyType;
  _count: {
    projects: number;
  };
};

const initialState: PartnerActionState = {};

export function PartnersManagement({ partners }: { partners: Partner[] }) {
  const [name, setName] = useState('');
  const [counterpartyType, setCounterpartyType] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string>();
  const [state, formAction, pending] = useActionState(
    async (previousState: PartnerActionState, formData: FormData) => {
      const result = await createPartner(previousState, formData);
      if (result.success) {
        setName('');
        setCounterpartyType(null);
        setClientError(undefined);
      }
      return result;
    },
    initialState
  );
  const fieldError = clientError ?? state.errors?.name?.[0] ?? state.errors?.counterpartyType?.[0];

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    const result = partnerSchema.safeParse({ name, counterpartyType });

    if (!result.success) {
      event.preventDefault();
      setClientError(result.error.issues[0].message);
      return;
    }

    setClientError(undefined);
  }

  return (
    <Card className="border-border flex w-full flex-col gap-4 rounded-[14px] border bg-white p-6 ring-0">
      <CardHeader className="px-0">
        <CardTitle className="font-sans text-base leading-6 font-semibold tracking-normal">
          Socios de proyectos
        </CardTitle>
      </CardHeader>
      <div className="flex w-full flex-col gap-1.5">
        <form
          action={formAction}
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nuevo socio..."
            aria-label="Nombre del socio"
            required
            maxLength={100}
            className="border-border placeholder:text-muted-foreground h-9 min-w-0 flex-1 rounded-md border bg-white px-3 py-1 font-sans text-base leading-6 font-normal tracking-normal shadow-[0_1px_2px_0_rgb(0_0_0/0.1)]"
          />
          <Select
            items={COUNTERPARTY_OPTIONS}
            name="counterpartyType"
            value={counterpartyType}
            onValueChange={setCounterpartyType}
            required
          >
            <SelectTrigger
              aria-label="Tipo de contraparte"
              className="border-input bg-background w-full rounded-lg px-3 text-sm data-[size=default]:h-9 sm:w-56"
            >
              <SelectValue placeholder="Tipo de contraparte" className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent align="start">
              {COUNTERPARTY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending} className="h-9 rounded-lg px-4 py-2 shadow">
            Agregar
          </Button>
        </form>

        {fieldError && <p className="text-destructive text-xs">{fieldError}</p>}

        {state.formError && <p className="text-destructive text-xs">{state.formError}</p>}
      </div>
      <Separator className="w-full" />
      <p className="text-muted-foreground font-sans text-xs leading-4 font-normal">
        {partners.length === 1 ? '1 socio' : `${partners.length} socios`}
      </p>
      <ul className="w-full">
        {partners.map((partner) => (
          <PartnerRow key={partner.id} partner={partner} />
        ))}
      </ul>
    </Card>
  );
}

function PartnerRow({ partner }: { partner: Partner }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState(partner.name);
  const [editedType, setEditedType] = useState<string | null>(partner.counterpartyType);
  const isTypeLocked = partner._count.projects > 0;
  const [editClientError, setEditClientError] = useState<string>();
  const [showEditErrors, setShowEditErrors] = useState(false);
  const [editState, editFormAction, editPending] = useActionState(
    async (previousState: PartnerActionState, formData: FormData) => {
      const result = await editPartner(partner.id, previousState, formData);
      if (result.success) setIsEditOpen(false);
      return result;
    },
    initialState
  );
  const [state, formAction, pending] = useActionState(
    deletePartner.bind(null, partner.id),
    initialState
  );

  function handleEditOpenChange(open: boolean) {
    setIsEditOpen(open);
    if (open) {
      setEditedName(partner.name);
      setEditedType(partner.counterpartyType);
      setEditClientError(undefined);
      setShowEditErrors(false);
    }
  }

  function handleEditSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    setShowEditErrors(true);
    const result = partnerSchema.safeParse({ name: editedName, counterpartyType: editedType });

    if (!result.success) {
      event.preventDefault();
      setEditClientError(result.error.issues[0].message);
      return;
    }

    setEditClientError(undefined);
  }

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-x-2 gap-y-1.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-x-4">
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

        <div className="contents">
          <ProjectCountLink
            projectCount={partner._count.projects}
            href={`/dashboard/projects?partnerId=${partner.id}&status=all&beneficiaryYear=all`}
          />

          <div className="contents lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label={`Acciones para ${partner.name}`}>
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditOpenChange(true)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AlertDialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
            <AlertDialogTrigger
              render={<Button variant="ghost" className="hidden lg:inline-flex" />}
            >
              Editar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Editar socio</AlertDialogTitle>
                <AlertDialogDescription>
                  Cambiá el nombre o el tipo de contraparte del socio.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form
                action={editFormAction}
                onSubmit={handleEditSubmit}
                noValidate
                className="flex flex-col gap-4"
              >
                <Input
                  name="name"
                  value={editedName}
                  onChange={(event) => setEditedName(event.target.value)}
                  maxLength={100}
                  required
                  disabled={editPending}
                  aria-label="Nombre del socio"
                />
                <div className="flex flex-col gap-1.5">
                  <Select
                    items={COUNTERPARTY_OPTIONS}
                    name={isTypeLocked ? undefined : 'counterpartyType'}
                    value={editedType}
                    onValueChange={setEditedType}
                    disabled={editPending || isTypeLocked}
                    required
                  >
                    <SelectTrigger
                      aria-label="Tipo de contraparte"
                      className="border-input bg-background w-full rounded-lg px-3 text-sm data-[size=default]:h-9"
                    >
                      <SelectValue placeholder="Tipo de contraparte" className="min-w-0 truncate" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {COUNTERPARTY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isTypeLocked && (
                    <>
                      <input
                        type="hidden"
                        name="counterpartyType"
                        value={partner.counterpartyType}
                      />
                      <p className="text-muted-foreground text-xs">
                        No se puede cambiar el tipo de un socio asociado a proyectos.
                      </p>
                    </>
                  )}
                </div>
                {showEditErrors &&
                  (editClientError ??
                    editState.errors?.name?.[0] ??
                    editState.errors?.counterpartyType?.[0] ??
                    editState.formError) && (
                    <p className="text-destructive text-sm">
                      {editClientError ??
                        editState.errors?.name?.[0] ??
                        editState.errors?.counterpartyType?.[0] ??
                        editState.formError}
                    </p>
                  )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={editPending}>Cancelar</AlertDialogCancel>
                  <Button type="submit" disabled={editPending}>
                    Guardar
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>

          {partner._count.projects > 0 ? (
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialogTrigger
                render={<Button variant="ghost" className="hidden lg:inline-flex" />}
              >
                Eliminar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>No se puede eliminar el socio</AlertDialogTitle>
                  <AlertDialogDescription>
                    No se puede eliminar un socio asociado a proyectos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Entendido</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <form id={`delete-partner-${partner.id}`} action={formAction} className="contents">
              <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogTrigger
                  render={
                    <Button variant="ghost" className="hidden lg:inline-flex" disabled={pending} />
                  }
                >
                  Eliminar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar socio?</AlertDialogTitle>
                    <AlertDialogDescription className="wrap-anywhere">
                      Esta acción dejará de mostrar “{partner.name}” como socio.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {state.formError && <p className="text-destructive text-sm">{state.formError}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      type="submit"
                      form={`delete-partner-${partner.id}`}
                      variant="destructive"
                      disabled={pending}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
