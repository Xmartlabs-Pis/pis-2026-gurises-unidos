'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProject } from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/forms/form-section';
import { notify } from '@/lib/notify';
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

export function DeleteProjectSection({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const { error } = await deleteProject(projectId);
      if (error) {
        setOpen(false);
        notify.error({ title: error });
        return;
      }
      notify.success({ title: 'El proyecto fue eliminado con éxito' });
      router.push('/dashboard/projects');
    });
  }

  return (
    <FormSection
      variant="detailed"
      title="Eliminar proyecto"
      description="El proyecto dejará de aparecer en el listado. Esta acción no se puede deshacer."
      descriptionSpacing="relaxed"
    >
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={<Button type="button" variant="outline" className="text-destructive" />}
        >
          Eliminar proyecto
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              El proyecto dejará de aparecer en el listado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormSection>
  );
}
