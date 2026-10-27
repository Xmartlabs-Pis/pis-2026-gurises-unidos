'use client';

import { useActionState, useState } from 'react';
import {
  createStrategicLine,
  deleteStrategicLine,
  editStrategicLine,
  type StrategicLineActionState,
} from '@/app/actions/strategic-lines';
import { ProjectCountLink } from '@/components/project-count-link';
import { strategicLineSchema } from '@/lib/validation/strategic-line';
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

type StrategicLinesManagementProps = {
  lines: StrategicLine[];
};

type StrategicLine = {
  id: number;
  name: string;
  _count: {
    projects: number;
  };
};

const initialState: StrategicLineActionState = {};

export function StrategicLinesManagement({ lines }: StrategicLinesManagementProps) {
  const [name, setName] = useState('');
  const [clientError, setClientError] = useState<string>();
  const [state, formAction, pending] = useActionState(
    async (previousState: StrategicLineActionState, formData: FormData) => {
      const result = await createStrategicLine(previousState, formData);
      if (result.success) {
        setName('');
        setClientError(undefined);
      }
      return result;
    },
    initialState
  );

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const result = strategicLineSchema.safeParse({
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
          Líneas Estratégicas de proyectos
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
            placeholder="Nueva línea estratégica..."
            required
            maxLength={100}
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
        {lines.length === 1 ? '1 línea estratégica' : `${lines.length} líneas estratégicas`}
      </p>
      <ul className="w-full">
        {lines.map((line) => (
          <StrategicLineRow key={line.id} line={line} />
        ))}
      </ul>
    </Card>
  );
}

function StrategicLineRow({ line }: { line: StrategicLine }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState(line.name);
  const [editAttempted, setEditAttempted] = useState(false);
  const [editState, editFormAction, editPending] = useActionState(
    editStrategicLine.bind(null, line.id),
    initialState
  );
  const [state, formAction, pending] = useActionState(
    deleteStrategicLine.bind(null, line.id),
    initialState
  );

  function handleEditOpenChange(open: boolean) {
    setIsEditOpen(open);
    if (open) {
      setEditedName(line.name);
      setEditAttempted(false);
    }
  }

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-x-2 gap-y-1.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-x-4">
        <span
          lang="es"
          className="text-foreground min-w-0 text-sm leading-5 font-medium break-words hyphens-auto"
        >
          {line.name}
        </span>

        <div className="contents">
          <ProjectCountLink
            projectCount={line._count.projects}
            href={`/dashboard/projects?strategicLineId=${line.id}&status=all&beneficiaryYear=all`}
          />

          <div className="contents lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label={`Acciones para ${line.name}`}>
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

          <AlertDialog
            open={isEditOpen && !(editAttempted && editState.success)}
            onOpenChange={handleEditOpenChange}
          >
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  className="hidden lg:inline-flex"
                  aria-label="Editar línea estratégica"
                  title="Editar línea estratégica"
                />
              }
            >
              Editar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Editar línea estratégica</AlertDialogTitle>
                <AlertDialogDescription>
                  Cambiá el nombre de la línea estratégica.
                </AlertDialogDescription>
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
                  maxLength={100}
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

          {line._count.projects > 0 ? (
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    className="hidden lg:inline-flex"
                    aria-label="Eliminar línea estratégica"
                    title="Eliminar línea estratégica"
                  />
                }
              >
                Eliminar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>No se puede eliminar la línea estratégica</AlertDialogTitle>
                  <AlertDialogDescription>
                    No se puede eliminar una línea estratégica asociada a proyectos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Entendido</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <form id={`delete-strategic-line-${line.id}`} action={formAction} className="contents">
              <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="hidden lg:inline-flex"
                      disabled={pending}
                      aria-label="Eliminar línea estratégica"
                      title="Eliminar línea estratégica"
                    />
                  }
                >
                  Eliminar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar línea estratégica?</AlertDialogTitle>
                    <AlertDialogDescription className="wrap-anywhere">
                      Esta acción dejará de mostrar “{line.name}” como línea estratégica.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {state.formError && <p className="text-destructive text-sm">{state.formError}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      type="submit"
                      form={`delete-strategic-line-${line.id}`}
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
