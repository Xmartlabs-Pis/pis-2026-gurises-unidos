'use client';

import { useActionState, useState } from 'react';
import {
  createBeneficiaryCategory,
  deleteBeneficiaryCategory,
  editBeneficiaryCategory,
  type BeneficiaryCategoryActionState,
} from '@/app/actions/beneficiary-categories';
import { beneficiaryCategorySchema } from '@/lib/validation/beneficiary-category';
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
import { ProjectCountLink } from '@/components/project-count-link';

type BeneficiaryCategoriesManagementProps = {
  categories: Category[];
};

type Category = {
  id: number;
  name: string;
  isSystem: boolean;
  projectCount: number;
};

const INITIAL_STATE: BeneficiaryCategoryActionState = {};

export function BeneficiaryCategoriesManagement({
  categories,
}: BeneficiaryCategoriesManagementProps) {
  const [name, setName] = useState('');
  const [clientError, setClientError] = useState<string>();
  const [state, formAction, pending] = useActionState(
    async (previousState: BeneficiaryCategoryActionState, formData: FormData) => {
      const result = await createBeneficiaryCategory(previousState, formData);
      if (result.success) {
        setName('');
        setClientError(undefined);
      }
      return result;
    },
    INITIAL_STATE
  );

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const result = beneficiaryCategorySchema.safeParse({
      name: formData.get('name'),
    });

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
          Categorías
        </CardTitle>
      </CardHeader>
      <div className="flex w-full flex-col gap-1.5">
        <form
          action={formAction}
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full items-center gap-2"
        >
          <Input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nueva categoría..."
            required
            maxLength={50}
            className="border-border placeholder:text-muted-foreground h-9 min-w-0 flex-1 rounded-md border bg-white px-3 py-1 font-sans text-base leading-6 font-normal tracking-normal shadow-[0_1px_2px_0_rgb(0_0_0/0.1)]"
          />
          <Button type="submit" disabled={pending} className="h-9 rounded-lg px-4 py-2 shadow">
            Agregar
          </Button>
        </form>

        {(clientError ?? state.errors?.name?.[0]) && (
          <p className="text-destructive text-xs">{clientError ?? state.errors?.name?.[0]}</p>
        )}

        {state.formError && <p className="text-destructive text-xs">{state.formError}</p>}
      </div>
      <Separator className="w-full" />
      <p className="text-muted-foreground font-sans text-xs leading-4 font-normal">
        {categories.length === 1 ? '1 categoría' : `${categories.length} categorías`}
      </p>
      <ul className="w-full">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
    </Card>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [editAttempted, setEditAttempted] = useState(false);
  const [editState, editFormAction, editPending] = useActionState(
    editBeneficiaryCategory.bind(null, category.id),
    INITIAL_STATE
  );
  const [state, formAction, pending] = useActionState(
    deleteBeneficiaryCategory.bind(null, category.id),
    INITIAL_STATE
  );

  function handleEditOpenChange(open: boolean) {
    setIsEditOpen(open);
    if (open) {
      setEditedName(category.name);
      setEditAttempted(false);
    }
  }

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto_auto] items-center gap-x-2 gap-y-1.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-x-4">
        <span
          lang="es"
          className="text-foreground min-w-0 text-sm leading-5 font-medium break-words hyphens-auto"
        >
          {category.name}
        </span>

        <div className="contents">
          <ProjectCountLink
            projectCount={category.projectCount}
            href={`/dashboard/projects?beneficiaryCategoryId=${category.id}&status=all&beneficiaryYear=all`}
          />

          <div className="contents lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label={`Acciones para ${category.name}`}>
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditOpenChange(true)}>Editar</DropdownMenuItem>
                {!category.isSystem && (
                  <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AlertDialog
            open={isEditOpen && !(editAttempted && editState.success)}
            onOpenChange={handleEditOpenChange}
          >
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  className="hidden lg:inline-flex"
                  aria-label="Editar categoría"
                  title="Editar categoría"
                />
              }
            >
              Editar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Editar categoría</AlertDialogTitle>
                <AlertDialogDescription>Cambiá el nombre de la categoría.</AlertDialogDescription>
              </AlertDialogHeader>
              <form
                action={editFormAction}
                onSubmit={() => setEditAttempted(true)}
                className="flex flex-col gap-4"
              >
                <Input
                  name="name"
                  value={editedName}
                  onChange={(event) => setEditedName(event.target.value)}
                  maxLength={50}
                  required
                  disabled={editPending}
                />
                {editAttempted && (editState.errors?.name?.[0] ?? editState.formError) && (
                  <p className="text-destructive text-sm">
                    {editState.errors?.name?.[0] ?? editState.formError}
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

          {category.isSystem ? (
            <span className="text-muted-foreground hidden h-8 items-center px-2.5 text-sm leading-5 font-medium lg:inline-flex">
              Sistema
            </span>
          ) : category.projectCount > 0 ? (
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    className="hidden lg:inline-flex"
                    aria-label="Eliminar categoría"
                    title="Eliminar categoría"
                  />
                }
              >
                Eliminar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>No se puede eliminar la categoría</AlertDialogTitle>
                  <AlertDialogDescription>
                    No se puede eliminar una categoría con valores cargados en proyectos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Entendido</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <form id={`delete-category-${category.id}`} action={formAction} className="contents">
              <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="hidden lg:inline-flex"
                      disabled={pending}
                      aria-label="Eliminar categoría"
                      title="Eliminar categoría"
                    />
                  }
                >
                  Eliminar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción dejará de mostrar “{category.name}” en el formulario de proyectos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {state.formError && <p className="text-destructive text-sm">{state.formError}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      type="submit"
                      form={`delete-category-${category.id}`}
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
