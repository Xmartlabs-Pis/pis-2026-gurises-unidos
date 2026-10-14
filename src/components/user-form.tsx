'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useState, type SubmitEvent } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'cn';

import { createUser, updateUser } from '@/app/actions/users';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/forms/form-actions';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldDescription, FieldGroup } from '@/components/ui/field';
import { SelectField } from '@/components/ui/forms/select-field';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { UserStatusDialog } from '@/components/users/user-status-dialog';

import { Copy } from 'lucide-react';

import { userEditFormSchema, userFormSchema, type UserFormState } from '@/lib/validation/user';
import { generateTemporaryPassword } from '@/lib/users';
import { STATUS_CLASSNAMES, STATUS_LABELS } from '@/lib/users/constants';
import { copyText } from '@/lib/clipboard';
import { notify } from '@/lib/notify';

const initialState: UserFormState = {};

type UserFormValues = {
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  role: 'admin' | 'coordinator';
  password: string;
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
    'La persona no podrá iniciar sesión hasta que la vuelvas a habilitar. Se conservan sus datos.',
  disabled: 'La persona podrá volver a iniciar sesión con su contraseña actual.',
  pendingInvitation:
    'La persona todavía no aceptó la invitación. El estado se podrá modificar cuando la acepte.',
};

export function UserForm({ mode = 'create', initialValues }: UserFormProps) {
  const router = useRouter();
  const isEditing = mode === 'edit';
  const action = isEditing && initialValues ? updateUser.bind(null, initialValues.id) : createUser;
  const [state, formAction, pending] = useActionState(action, initialState);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isEditing ? userEditFormSchema : userFormSchema
    ) as unknown as Resolver<UserFormValues>,
    defaultValues: {
      firstName: initialValues?.firstName ?? '',
      lastName: initialValues?.lastName ?? '',
      documentId: initialValues?.documentId ?? '',
      email: initialValues?.email ?? '',
      role: initialValues?.role ?? 'coordinator',
      password: '',
    },
    mode: 'onChange',
  });
  const {
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  function handleGeneratePassword() {
    const generated = generateTemporaryPassword();
    setValue('password', generated, { shouldValidate: true });
  }

  async function handleCopyPassword() {
    const password = getValues('password');
    if (!password) return;

    try {
      await copyText(password);
      notify.success({ title: 'Contraseña copiada al portapapeles' });
    } catch {
      notify.error({ title: 'No se pudo copiar la contraseña' });
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const submitter = event.nativeEvent.submitter;
    return handleSubmit(() => {
      startTransition(() => {
        formAction(submitter ? new FormData(formElement, submitter) : new FormData(formElement));
      });
    })(event);
  }

  useEffect(() => {
    if (!state.formError) return;
    notify.error({ title: state.formError });
  }, [state]);

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
                    {isEditing && initialValues ? (
                      <ResetPasswordDialog
                        userId={initialValues.id}
                        userName={`${initialValues.firstName} ${initialValues.lastName}`}
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TextInputField
                          id="password"
                          name="password"
                          label="Contraseña temporal"
                          type="text"
                          placeholder="Se genera automáticamente"
                          messages={[errors?.password?.message ?? '']}
                          trailingAction={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Copiar contraseña"
                              onClick={handleCopyPassword}
                            >
                              <Copy className="size-3" />
                            </Button>
                          }
                        />
                      </div>
                    )}
                    {!isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-auto min-h-9 w-fit max-w-full px-4 py-1.5 whitespace-normal"
                        onClick={handleGeneratePassword}
                      >
                        Generar contraseña automáticamente
                      </Button>
                    )}
                    <FieldDescription className="text-xs leading-4">
                      {isEditing
                        ? 'Se generará una contraseña temporal que la persona deberá cambiar al ingresar.'
                        : 'El administrador comparte esta contraseña con la persona. El ingreso al sistema es por cédula.'}
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
          submitLabel={'Guardar usuario'}
          pending={pending}
        />
      </form>
    </FormProvider>
  );
}
