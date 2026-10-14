'use client';

import { startTransition, useActionState, useEffect, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserRole, UserStatus } from '@/generated/prisma/enums';
import { updateProfile } from '@/app/actions/profile';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { FormActions } from '@/components/ui/forms/form-actions';
import { TextInputField } from '@/components/ui/forms/text-input-field';
import { Input } from '@/components/ui/input';
import { ChangePasswordForm } from '@/components/users/change-password-form';
import { notify } from '@/lib/notify';
import { ROLE_LABELS, STATUS_CLASSNAMES, STATUS_LABELS } from '@/lib/users/constants';
import { formatDate } from '@/lib/users/format';
import {
  profileFormSchema,
  type ProfileFormState,
  type ProfileFormValues,
} from '@/lib/validation/profile';

const INITIAL_STATE: ProfileFormState = {};
const PROFILE_FORM_ID = 'profile-form';

type Profile = ProfileFormValues & {
  documentId: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastAccess: Date | null;
  updatedAt: Date | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();

  return <ProfileFormFields profile={profile} onCancel={() => router.back()} />;
}

function ProfileFormFields({ profile, onCancel }: { profile: Profile; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(updateProfile, INITIAL_STATE);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema) as Resolver<ProfileFormValues>,
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
    },
    mode: 'onChange',
  });
  const { handleSubmit, reset } = form;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    return handleSubmit(() => {
      startTransition(() => {
        formAction(new FormData(formElement));
      });
    })(event);
  }

  useEffect(() => {
    if (state.formError) {
      notify.error({ title: state.formError });
      return;
    }
    if (!state.success) return;
    notify.success({ title: 'Tus datos se actualizaron correctamente.' });
    if (state.values) reset(state.values);
  }, [state, reset]);

  return (
    <FormProvider {...form}>
      <div className="bg-primary-foreground flex min-h-0 w-full min-w-0 flex-1 flex-col pt-6">
        <div className="mx-auto w-full max-w-[1185px] flex-1 px-6 pb-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_425px]">
            <div className="flex min-w-0 flex-col gap-5">
              <form id={PROFILE_FORM_ID} onSubmit={onSubmit} noValidate>
                <Card className="gap-4 pt-5 pb-5">
                  <CardHeader className="px-6">
                    <CardTitle className="leading-6 font-semibold">Datos personales</CardTitle>
                    <CardDescription>
                      Actualizá la información que utilizamos para identificarte en el sistema.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextInputField
                        id="profile-first-name"
                        name="firstName"
                        label="Nombre"
                        messages={state.errors?.firstName}
                        autoComplete="given-name"
                      />
                      <TextInputField
                        id="profile-last-name"
                        name="lastName"
                        label="Apellido"
                        messages={state.errors?.lastName}
                        autoComplete="family-name"
                      />
                      <Field className="min-w-0 gap-1.5">
                        <FieldLabel
                          htmlFor="profile-document-id"
                          className="text-foreground text-xs leading-4 font-medium"
                        >
                          Documento (Cédula)
                        </FieldLabel>
                        <Input
                          id="profile-document-id"
                          value={profile.documentId}
                          readOnly
                          className="border-input bg-muted h-9 min-w-0 rounded-lg px-3 text-base shadow-none md:text-sm"
                        />
                        <FieldDescription className="text-xs leading-4">
                          El documento no se puede modificar desde tu perfil.
                        </FieldDescription>
                      </Field>
                      <TextInputField
                        id="profile-email"
                        name="email"
                        label="Correo electrónico"
                        messages={state.errors?.email}
                        autoComplete="email"
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>

              <ChangePasswordForm />
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Card className="gap-4 pt-5 pb-5">
                <CardHeader className="px-6">
                  <CardTitle className="leading-6 font-semibold">Cuenta</CardTitle>
                  <CardDescription>
                    El rol y el estado solamente pueden ser modificados por un administrador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6">
                  <dl className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <dt className="font-medium">Rol</dt>
                      <dd>{ROLE_LABELS[profile.role]}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <dt className="font-medium">Estado</dt>
                      <dd>
                        <Badge className={STATUS_CLASSNAMES[profile.status]}>
                          {STATUS_LABELS[profile.status]}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="gap-4 pt-5 pb-5">
                <CardHeader className="px-6">
                  <CardTitle className="leading-6 font-semibold">Información</CardTitle>
                </CardHeader>
                <CardContent className="px-6">
                  <dl className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4 text-xs leading-4">
                      <dt className="font-medium">Fecha de creación</dt>
                      <dd className="text-right">{formatDate(profile.createdAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs leading-4">
                      <dt className="font-medium">Último acceso</dt>
                      <dd className="text-right">{formatDate(profile.lastAccess)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs leading-4">
                      <dt className="font-medium">Última modificación</dt>
                      <dd className="text-right">{formatDate(profile.updatedAt)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <FormActions
          form={PROFILE_FORM_ID}
          onCancel={onCancel}
          submitLabel="Guardar cambios"
          pending={pending}
        />
      </div>
    </FormProvider>
  );
}
