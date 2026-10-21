'use client';

import { useRouter } from 'next/navigation';
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'cn';

import { createUser, updateUser } from '@/app/actions/users';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/forms/form-actions';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldDescription, FieldGroup } from '@/components/ui/field';
import { SelectField } from '@/components/ui/forms/select-field';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { UserStatusDialog } from '@/components/users/user-status-dialog';

import { userEditFormSchema, type UserFormState } from '@/lib/validation/user';
import { STATUS_CLASSNAMES, STATUS_LABELS } from '@/lib/users/constants';
import { notify } from '@/lib/notify';

const initialState: UserFormState = {};

type UserFormValues = {
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  role: 'admin' | 'coordinator';
};

type UserFormProps = {
  mode?: 'create' | 'edit';
  initialValues?: {
    id: number;
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    role: 'admin' | 'coordinator';
    status: 'active' | 'pendingInvitation' | 'disabled';
    information: {
      createdAt: string;
      lastAccess: string;
      createdBy: string;
      updatedAt: string;
    };
  };
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'coordinator', label: 'Coordinador' },
];

const INFO_ROWS = [
  { key: 'createdAt', label: 'Fecha de creación' },
  { key: 'lastAccess', label: 'Último acceso' },
  { key: 'createdBy', label: 'Creado por' },
  { key: 'updatedAt', label: 'Última modificación' },
] as const;

const STATUS_DESCRIPTIONS = {
  active:
    'Si lo deshabilitás, la persona no podrá iniciar sesión hasta que la vuelvas a habilitar. Se conservan sus datos.',
  disabled: 'Si lo habilitás, la persona podrá volver a iniciar sesión con su contraseña actual.',
  pendingInvitation:
    'La persona todavía no aceptó la invitación. El estado se podrá modificar cuando la acepte.',
};

export function UserForm({ mode = 'create', initialValues }: UserFormProps) {
  const router = useRouter();
  const isEditing = mode === 'edit';
  const isPendingInvitation = initialValues?.status === 'pendingInvitation';
  const securityDescription = !isEditing
    ? 'Al guardar, se enviará una invitación al correo ingresado para que la persona elija su contraseña. El ingreso al sistema es por cédula.'
    : isPendingInvitation
      ? 'La persona elegirá su contraseña al aceptar la invitación. Podés reenviarla desde la lista de usuarios.'
      : 'Se generará una contraseña temporal que la persona deberá cambiar al ingresar.';
  const action = isEditing && initialValues ? updateUser.bind(null, initialValues.id) : createUser;
  const [state, formAction, pending] = useActionState(action, initialState);
  const lastSubmission = useRef<FormData | null>(null);
  const [answeredRestoreState, setAnsweredRestoreState] = useState<UserFormState>();
  const isRestoreDialogOpen =
    Boolean(state.restoreConfirmationRequired) && answeredRestoreState !== state;
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userEditFormSchema) as unknown as Resolver<UserFormValues>,
    defaultValues: {
      firstName: initialValues?.firstName ?? '',
      lastName: initialValues?.lastName ?? '',
      documentId: initialValues?.documentId ?? '',
      email: initialValues?.email ?? '',
      role: initialValues?.role ?? 'coordinator',
    },
    mode: 'onChange',
  });
  const { handleSubmit } = form;
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const submitter = event.nativeEvent.submitter;
    return handleSubmit(() => {
      const formData = submitter ? new FormData(formElement, submitter) : new FormData(formElement);
      lastSubmission.current = formData;
      startTransition(() => {
        formAction(formData);
      });
    })(event);
  }

  function handleCancelRestore() {
    setAnsweredRestoreState(state);
  }

  function handleConfirmRestore() {
    setAnsweredRestoreState(state);
    if (!lastSubmission.current) return;

    const formData = new FormData();
    lastSubmission.current.forEach((value, key) => formData.append(key, value));
    formData.set('confirmRestore', 'true');
    startTransition(() => {
      formAction(formData);
    });
  }

  useEffect(() => {
    if (state.restored) {
      notify.success({
        title: 'La cuenta se restauró con los nuevos datos y se envió la invitación.',
      });
      router.push('/management/users');
      return;
    }

    if (!state.formError) return;
    notify.error({ title: state.formError });
  }, [state, router]);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={onSubmit}
        noValidate
        className="bg-primary-foreground flex w-full min-w-0 flex-1 flex-col pt-6"
      >
        <div className="mx-auto w-full max-w-[1185px] flex-1 px-6 pb-6">
          <div
            className={cn(
              'grid grid-cols-1 gap-6',
              isEditing && 'xl:grid-cols-[minmax(0,1fr)_425px]'
            )}
          >
            <div className="flex min-w-0 flex-col gap-5">
              <Card className="gap-4 pt-5 pb-5">
                <CardHeader className="px-6">
                  <CardTitle className="leading-6 font-semibold">Datos personales</CardTitle>
                </CardHeader>
                <CardContent className="px-6">
                  <FieldGroup className="gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextInputField
                        id="firstName"
                        name="firstName"
                        label="Nombre"
                        placeholder={isEditing ? 'Nombre' : 'Ej. Ana'}
                      />
                      <TextInputField
                        id="lastName"
                        name="lastName"
                        label="Apellido"
                        placeholder={isEditing ? 'Apellido' : 'Ej. García'}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextInputField
                        id="documentId"
                        name="documentId"
                        label="Documento (Cédula)"
                        placeholder="1.234.567-8"
                      />
                      <TextInputField
                        id="email"
                        name="email"
                        label="Correo electrónico"
                        type="email"
                        placeholder="nombre@gurises-unidos.org.uy"
                      />
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card className="gap-4 pt-5 pb-5">
                <CardHeader className="px-6">
                  <CardTitle className="leading-6 font-semibold">Permisos</CardTitle>
                </CardHeader>
                <CardContent className="px-6">
                  <SelectField
                    id="role"
                    name="role"
                    label="Rol"
                    options={ROLE_OPTIONS}
                    description="Los administradores pueden gestionar usuarios y configurar el sistema."
                  />
                </CardContent>
              </Card>

              {isEditing && initialValues && (
                <Card className="gap-4 pt-5 pb-5">
                  <CardHeader className="px-6">
                    <CardTitle className="leading-6 font-semibold">Estado</CardTitle>
                    <CardAction>
                      <Badge className={STATUS_CLASSNAMES[initialValues.status]}>
                        <span aria-hidden className="size-1.5 rounded-full bg-current" />
                        {STATUS_LABELS[initialValues.status]}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="px-6">
                    <FieldGroup className="gap-4">
                      {initialValues.status !== 'pendingInvitation' && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="w-fit px-4"
                            onClick={() => setStatusDialogOpen(true)}
                          >
                            {initialValues.status === 'active'
                              ? 'Deshabilitar usuario'
                              : 'Habilitar usuario'}
                          </Button>
                          <UserStatusDialog
                            user={initialValues}
                            open={statusDialogOpen}
                            onOpenChange={setStatusDialogOpen}
                          />
                        </>
                      )}
                      <FieldDescription className="text-xs leading-4">
                        {STATUS_DESCRIPTIONS[initialValues.status]}
                      </FieldDescription>
                    </FieldGroup>
                  </CardContent>
                </Card>
              )}

              <Card className="gap-4 pt-5 pb-5">
                <CardHeader className="px-6">
                  <CardTitle className="leading-6 font-semibold">Seguridad</CardTitle>
                </CardHeader>
                <CardContent className="px-6">
                  <FieldGroup className="gap-4">
                    {isEditing && initialValues && !isPendingInvitation && (
                      <ResetPasswordDialog
                        userId={initialValues.id}
                        userName={`${initialValues.firstName} ${initialValues.lastName}`}
                      />
                    )}
                    <FieldDescription className="text-xs leading-4">
                      {securityDescription}
                    </FieldDescription>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            {isEditing && (
              <div className="min-w-0">
                <Card className="gap-4 pt-5 pb-5">
                  <CardHeader className="px-6">
                    <CardTitle className="leading-6 font-semibold">Información</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 px-6">
                    <dl className="flex flex-col gap-4">
                      {INFO_ROWS.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between text-xs leading-4 font-medium"
                        >
                          <dt className="text-foreground">{row.label}</dt>
                          <dd className="text-foreground">
                            {initialValues?.information[row.key] ?? '—'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        <FormActions
          onCancel={() => router.push('/management/users')}
          submitLabel={isEditing ? 'Guardar usuario' : 'Guardar y enviar invitación'}
          pending={pending}
        />
      </form>

      <AlertDialog
        open={isRestoreDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelRestore();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este documento pertenece a un usuario eliminado</AlertDialogTitle>
            <AlertDialogDescription>
              Si continuás, se restaura esa cuenta en lugar de crear una nueva:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            <li>Se reemplazan su nombre, correo y rol por los que ingresaste.</li>
            <li>Se le envía una invitación al correo para que elija una contraseña nueva.</li>
            <li>Recupera los proyectos y el historial que tenía asociados.</li>
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
}
