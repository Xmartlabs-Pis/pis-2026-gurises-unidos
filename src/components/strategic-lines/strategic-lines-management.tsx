'use client';

import { useActionState, useState } from 'react';
import {
  createStrategicLine,
  deleteStrategicLine,
  type StrategicLineActionState,
} from '@/app/actions/strategic-lines';
import { strategicLineSchema } from '@/lib/validation/strategic-line';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
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
          Líneas estratégicas de proyectos
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
  const [state, formAction, pending] = useActionState(
    deleteStrategicLine.bind(null, line.id),
    initialState
  );

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm leading-5 font-medium">{line.name}</span>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs leading-4 font-normal">
            {line._count.projects === 1 ? '1 proyecto' : `${line._count.projects} proyectos`}
          </span>

          {line._count.projects > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost">Eliminar</Button>} />
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
            <form id={`delete-strategic-line-${line.id}`} action={formAction}>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="ghost" disabled={pending} />}>
                  Eliminar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar línea estratégica?</AlertDialogTitle>
                    <AlertDialogDescription>
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
