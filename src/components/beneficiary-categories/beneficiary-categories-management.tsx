'use client';

import { useActionState, useState } from 'react';
import {
  createBeneficiaryCategory,
  deleteBeneficiaryCategory,
  type BeneficiaryCategoryActionState,
} from '@/app/actions/beneficiary-categories';
import { beneficiaryCategorySchema } from '@/lib/validation/beneficiary-category';
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
  const [state, formAction, pending] = useActionState(
    deleteBeneficiaryCategory.bind(null, category.id),
    INITIAL_STATE
  );

  return (
    <li className="border-b border-[#eff2f4] py-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm leading-5 font-medium">{category.name}</span>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs leading-4 font-normal">
            {category.projectCount === 1 ? '1 proyecto' : `${category.projectCount} proyectos`}
          </span>

          {category.isSystem ? (
            <span className="text-muted-foreground inline-flex h-8 items-center px-2.5 text-xs leading-4 font-medium">
              Sistema
            </span>
          ) : category.projectCount > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost">Eliminar</Button>} />
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
            <form id={`delete-category-${category.id}`} action={formAction}>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="ghost" disabled={pending} />}>
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
