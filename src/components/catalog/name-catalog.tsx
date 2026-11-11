'use client';

import { useActionState, useState, type ReactNode, type SubmitEvent } from 'react';
import { z } from 'zod';
import { MoreHorizontal } from 'lucide-react';
import { ProjectCountLink } from '@/components/project-count-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/alert-dialog';

export type CatalogRecord = {
  id: number;
  name: string;
  projectCount: number;
  deletable?: boolean;
};

type CatalogActionState = {
  errors?: Record<string, string[]>;
  formError?: string;
  success?: boolean;
};

type CatalogActions = {
  create: (state: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;
  edit: (id: number, state: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;
  delete: (id: number) => Promise<CatalogActionState>;
};

type NameCatalogProps<T extends CatalogRecord> = {
  items: T[];
  title: string;
  placeholder: string;
  maxLength: number;
  countLabel: (count: number) => string;
  schema: z.ZodType;
  projectFilter: string;
  idPrefix: string;
  actions: CatalogActions;
  editTitle: string;
  editDescription: string;
  blockedTitle: string;
  blockedDescription: string;
  deleteTitle: string;
  deleteDescription: (name: string) => string;
  nameAriaLabel?: string;
  formClassName?: string;
  systemLabel?: string;
  renderLabel?: (item: T) => ReactNode;
  createFields?: ReactNode;
  editFields?: (item: T, pending: boolean) => ReactNode;
};

const INITIAL_STATE: CatalogActionState = {};

const NAME_INPUT_CLASS =
  'border-border placeholder:text-muted-foreground h-9 min-w-0 flex-1 rounded-md border bg-white px-3 py-1 font-sans text-base leading-6 font-normal tracking-normal shadow-[0_1px_2px_0_rgb(0_0_0/0.1)]';

function clientError(schema: z.ZodType, formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    counterpartyType: formData.get('counterpartyType'),
  });
  if (parsed.success) return undefined;
  return parsed.error.issues[0]?.message;
}

function serverFieldError(errors?: Record<string, string[]>) {
  return errors?.name?.[0] ?? errors?.counterpartyType?.[0];
}

export function NameCatalog<T extends CatalogRecord>({
  items,
  title,
  placeholder,
  maxLength,
  countLabel,
  schema,
  projectFilter,
  idPrefix,
  actions,
  editTitle,
  editDescription,
  blockedTitle,
  blockedDescription,
  deleteTitle,
  deleteDescription,
  nameAriaLabel,
  formClassName = 'flex w-full items-center gap-2',
  systemLabel,
  renderLabel,
  createFields,
  editFields,
}: NameCatalogProps<T>) {
  const [name, setName] = useState('');
  const [clientErrorMessage, setClientErrorMessage] = useState<string>();
  const [createVersion, setCreateVersion] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previousState: CatalogActionState, formData: FormData) => {
      const result = await actions.create(previousState, formData);
      if (result.success) {
        setName('');
        setClientErrorMessage(undefined);
        setCreateVersion((version) => version + 1);
      }
      return result;
    },
    INITIAL_STATE
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    const message = clientError(schema, new FormData(event.currentTarget));
    if (message) {
      event.preventDefault();
      setClientErrorMessage(message);
      return;
    }
    setClientErrorMessage(undefined);
  }

  const fieldError = clientErrorMessage ?? serverFieldError(state.errors);

  return (
    <Card className="border-border flex w-full flex-col gap-4 rounded-[14px] border bg-white p-6 ring-0">
      <CardHeader className="px-0">
        <CardTitle className="font-sans text-base leading-6 font-semibold tracking-normal">
          {title}
        </CardTitle>
      </CardHeader>
      <div className="flex w-full flex-col gap-1.5">
        <form action={formAction} onSubmit={handleSubmit} noValidate className={formClassName}>
          <Input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={placeholder}
            aria-label={nameAriaLabel}
            required
            maxLength={maxLength}
            className={NAME_INPUT_CLASS}
          />
          {createFields ? (
            <div key={createVersion} className="contents">
              {createFields}
            </div>
          ) : null}
          <Button type="submit" disabled={pending} className="h-9 rounded-lg px-4 py-2 shadow">
            Agregar
          </Button>
        </form>
        {fieldError && <p className="text-destructive text-xs">{fieldError}</p>}
        {state.formError && <p className="text-destructive text-xs">{state.formError}</p>}
      </div>
      <Separator className="w-full" />
      <p className="text-muted-foreground font-sans text-xs leading-4 font-normal">
        {countLabel(items.length)}
      </p>
      <ul className="w-full">
        {items.map((item) => (
          <CatalogRow
            key={item.id}
            item={item}
            schema={schema}
            maxLength={maxLength}
            projectFilter={projectFilter}
            idPrefix={idPrefix}
            actions={actions}
            editTitle={editTitle}
            editDescription={editDescription}
            blockedTitle={blockedTitle}
            blockedDescription={blockedDescription}
            deleteTitle={deleteTitle}
            deleteDescription={deleteDescription}
            nameAriaLabel={nameAriaLabel}
            systemLabel={systemLabel}
            renderLabel={renderLabel}
            editFields={editFields}
          />
        ))}
      </ul>
    </Card>
  );
}

function CatalogRow<T extends CatalogRecord>({
  item,
  schema,
  maxLength,
  projectFilter,
  idPrefix,
  actions,
  editTitle,
  editDescription,
  blockedTitle,
  blockedDescription,
  deleteTitle,
  deleteDescription,
  nameAriaLabel,
  systemLabel,
  renderLabel,
  editFields,
}: {
  item: T;
  schema: z.ZodType;
  maxLength: number;
  projectFilter: string;
  idPrefix: string;
  actions: CatalogActions;
  editTitle: string;
  editDescription: string;
  blockedTitle: string;
  blockedDescription: string;
  deleteTitle: string;
  deleteDescription: (name: string) => string;
  nameAriaLabel?: string;
  systemLabel?: string;
  renderLabel?: (item: T) => ReactNode;
  editFields?: (item: T, pending: boolean) => ReactNode;
}) {
  const deletable = item.deletable !== false;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editClientError, setEditClientError] = useState<string>();
  const [showEditErrors, setShowEditErrors] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const [editState, editFormAction, editPending] = useActionState(
    async (previousState: CatalogActionState, formData: FormData) => {
      const result = await actions.edit(item.id, previousState, formData);
      if (result.success) setIsEditOpen(false);
      return result;
    },
    INITIAL_STATE
  );
  const [state, formAction, pending] = useActionState(
    actions.delete.bind(null, item.id),
    INITIAL_STATE
  );
  const deleteFormId = `delete-${idPrefix}-${item.id}`;
  const editError = editClientError ?? serverFieldError(editState.errors) ?? editState.formError;

  function handleEditOpenChange(open: boolean) {
    setIsEditOpen(open);
    if (open) {
      setEditedName(item.name);
      setEditClientError(undefined);
      setShowEditErrors(false);
      setEditVersion((version) => version + 1);
    }
  }

  function handleEditSubmit(event: SubmitEvent<HTMLFormElement>) {
    setShowEditErrors(true);
    const message = clientError(schema, new FormData(event.currentTarget));
    if (message) {
      event.preventDefault();
      setEditClientError(message);
      return;
    }
    setEditClientError(undefined);
  }

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-x-2 gap-y-1.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-x-4">
        {renderLabel ? (
          renderLabel(item)
        ) : (
          <span
            lang="es"
            className="text-foreground min-w-0 text-sm leading-5 font-medium break-words hyphens-auto"
          >
            {item.name}
          </span>
        )}
        <div className="contents">
          <ProjectCountLink
            projectCount={item.projectCount}
            href={`/dashboard/projects?${projectFilter}=${item.id}&status=all&beneficiaryYear=all`}
          />
          <div className="contents lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label={`Acciones para ${item.name}`}>
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditOpenChange(true)}>
                  Editar
                </DropdownMenuItem>
                {deletable && (
                  <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                    Eliminar
                  </DropdownMenuItem>
                )}
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
                <AlertDialogTitle>{editTitle}</AlertDialogTitle>
                <AlertDialogDescription>{editDescription}</AlertDialogDescription>
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
                  aria-label={nameAriaLabel}
                  maxLength={maxLength}
                  required
                  disabled={editPending}
                />
                {editFields ? (
                  <div key={editVersion} className="contents">
                    {editFields(item, editPending)}
                  </div>
                ) : null}
                {showEditErrors && editError && (
                  <p className="text-destructive text-sm">{editError}</p>
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
          {!deletable ? (
            <span className="text-muted-foreground hidden h-8 items-center px-2.5 text-sm leading-5 font-medium lg:inline-flex">
              {systemLabel}
            </span>
          ) : item.projectCount > 0 ? (
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialogTrigger
                render={<Button variant="ghost" className="hidden lg:inline-flex" />}
              >
                Eliminar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{blockedTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{blockedDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Entendido</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <form id={deleteFormId} action={formAction} className="contents">
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
                    <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
                    <AlertDialogDescription className="wrap-anywhere">
                      {deleteDescription(item.name)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {state.formError && <p className="text-destructive text-sm">{state.formError}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      type="submit"
                      form={deleteFormId}
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
