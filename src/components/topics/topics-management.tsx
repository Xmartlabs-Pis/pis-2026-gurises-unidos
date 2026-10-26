'use client';

import { useActionState, useState } from 'react';
import { createTopic, deleteTopic, type TopicActionState } from '@/app/actions/topics';
import { ProjectCountLink } from '@/components/project-count-link';
import { topicSchema } from '@/lib/validation/topic';
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

type TopicsManagementProps = {
  topics: Topic[];
};

type Topic = {
  id: number;
  name: string;
  _count: {
    projects: number;
  };
};

const initialState: TopicActionState = {};

export function TopicsManagement({ topics }: TopicsManagementProps) {
  const [name, setName] = useState('');
  const [clientError, setClientError] = useState<string>();
  const [state, formAction, pending] = useActionState(
    async (previousState: TopicActionState, formData: FormData) => {
      const result = await createTopic(previousState, formData);
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
    const result = topicSchema.safeParse({
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
          Temáticas de proyectos
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
            placeholder="Nueva temática..."
            required
            maxLength={30}
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
        {topics.length === 1 ? '1 temática' : `${topics.length} temáticas`}
      </p>
      <ul className="w-full">
        {topics.map((topic) => (
          <TopicRow key={topic.id} topic={topic} />
        ))}
      </ul>
    </Card>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const [state, formAction, pending] = useActionState(
    deleteTopic.bind(null, topic.id),
    initialState
  );

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm leading-5 font-medium">{topic.name}</span>

        <div className="flex items-center gap-3">
          <ProjectCountLink
            projectCount={topic._count.projects}
            href={`/dashboard/projects?topicId=${topic.id}&status=all&beneficiaryYear=all`}
          />

          {topic._count.projects > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost">Eliminar</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>No se puede eliminar la temática</AlertDialogTitle>
                  <AlertDialogDescription>
                    No se puede eliminar una temática con proyectos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Entendido</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <form id={`delete-topic-${topic.id}`} action={formAction}>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="ghost" disabled={pending} />}>
                  Eliminar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar temática?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción dejará de mostrar “{topic.name}” como temática disponible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {state.formError && <p className="text-destructive text-sm">{state.formError}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      type="submit"
                      form={`delete-topic-${topic.id}`}
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
