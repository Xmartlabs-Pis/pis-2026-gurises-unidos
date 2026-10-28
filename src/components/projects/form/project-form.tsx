'use client';

import { InternalNotesSection } from './sections/internal-notes-section';
import { PublicInfoSection } from './sections/public-info-section';
import { VisibilitySection } from './sections/visibility-section';
import { BeneficiariesSection } from './sections/beneficiaries-section';
import { TerritorySection } from './sections/territory-section';
import { BasicInfoSection } from './sections/basic-info-section';

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'cn';
import type { ProjectFormState } from '@/lib/validation/project';
import {
  FIRST_PROJECT_YEAR,
  type BeneficiaryCategoryOption,
  type BeneficiaryCounts,
} from '@/lib/project-display';
import { ProjectPreview } from './project-preview';
import type { ProjectFormValues } from './project-form-values';
import { buildProjectFormSchema } from '@/lib/validation/project-form';
import { FormActions } from '@/components/ui/forms/form-actions';
import { getDefaultValues } from './get-default-values';
import { getPreviewLabels } from './get-preview-labels';
import { notify } from '@/lib/notify';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';
import { useProjectCover } from './use-project-cover';

type ProjectFormProps = {
  mode?: 'create' | 'edit';
  projectId?: number;
  initialValues?: Partial<ProjectFormValues>;
  submitAction: (previousState: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  cancelHref?: string;
  children?: ReactNode;
  coordinators: { id: number; firstName: string; lastName: string }[];
  departments: { id: number; name: string }[];
  topics: { id: number; name: string }[];
  strategicLines: { id: number; name: string }[];
  beneficiaryRecords?: (BeneficiaryCounts & { year: number })[];
  beneficiaryCategories: BeneficiaryCategoryOption[];
  currentYear: number;
  canSelectCoordinator?: boolean;
};

const INITIAL_STATE: ProjectFormState = {};

async function uploadProjectCover(file: File, projectId?: number) {
  const body = new FormData();
  body.set('coverPhoto', file);
  if (projectId) body.set('projectId', String(projectId));
  const response = await fetch('/api/projects/covers', { method: 'POST', body });
  const payload = (await response.json().catch(() => null)) as {
    path?: string;
    error?: string;
  } | null;
  const path = payload?.path;
  if (!response.ok || !isUploadedCoverPath(path)) {
    return { ok: false as const, error: payload?.error ?? 'No se pudo subir la imagen.' };
  }
  return { ok: true as const, path };
}

export function ProjectForm({
  mode = 'create',
  projectId,
  coordinators,
  departments,
  topics,
  strategicLines,
  beneficiaryRecords = [],
  beneficiaryCategories,
  currentYear,
  initialValues,
  submitAction,
  cancelHref = '/dashboard/projects',
  children,
  canSelectCoordinator = false,
}: ProjectFormProps) {
  const router = useRouter();
  const isEditing = mode === 'edit';
  const yearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - FIRST_PROJECT_YEAR + 1 }, (_, index) => ({
        value: String(currentYear - index),
        label: String(currentYear - index),
      })),
    [currentYear]
  );
  const coordinatorOptions = useMemo(
    () =>
      coordinators.map((coordinator) => ({
        value: String(coordinator.id),
        label: `${coordinator.firstName} ${coordinator.lastName}`,
      })),
    [coordinators]
  );
  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        value: String(department.id),
        label: department.name,
      })),
    [departments]
  );
  const schema = useMemo(
    () => buildProjectFormSchema(beneficiaryCategories.map(({ key }) => key)),
    [beneficiaryCategories]
  );
  const defaultValues = {
    ...getDefaultValues(currentYear, beneficiaryCategories),
    ...initialValues,
  };
  const cover = useProjectCover(defaultValues.coverPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [state, formAction, pending] = useActionState(submitAction, INITIAL_STATE);
  const busy = pending || uploading;
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ProjectFormValues>,
    defaultValues,
    mode: 'onChange',
  });
  const { control, handleSubmit } = form;
  const submissionRef = useRef(false);
  const watchedValues = useWatch({ control });
  const values = {
    ...defaultValues,
    ...watchedValues,
    coverPhotoUrl: cover.previewUrl,
  } as ProjectFormValues;

  const { locationLabel, coverageLabel, beneficiaryTotal } = getPreviewLabels(
    values,
    departments,
    isEditing,
    beneficiaryCategories
  );

  const beneficiaryYearOptions = yearOptions.filter(
    ({ value }) =>
      Number(value) >= Number(values.startYear) &&
      (values.status !== 'inactive' || !values.endYear || Number(value) <= Number(values.endYear))
  );

  useEffect(() => {
    if (!pending) submissionRef.current = false;
  }, [pending, state]);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionRef.current) return;

    if (mode === 'create' && topics.length === 0) {
      form.setError('topicIds', {
        type: 'manual',
        message:
          'No hay temáticas disponibles. Un administrador debe crear o activar una antes de crear proyectos.',
      });
      return;
    }

    submissionRef.current = true;
    const formElement = event.currentTarget;
    return handleSubmit(
      async () => {
        const data = new FormData(formElement);
        if (cover.file) {
          setUploading(true);
          try {
            const uploaded = await uploadProjectCover(cover.file, projectId);
            if (!uploaded.ok) {
              notify.error({ title: uploaded.error });
              submissionRef.current = false;
              return;
            }
            data.set('coverPhotoPath', uploaded.path);
          } catch {
            notify.error({ title: 'No se pudo subir la imagen.' });
            submissionRef.current = false;
            return;
          } finally {
            setUploading(false);
          }
        }
        startTransition(() => {
          formAction(data);
        });
      },
      () => {
        submissionRef.current = false;
      }
    )(event);
  }

  useEffect(() => {
    if (state.errors?.topicIds || state.errors?.strategicLineIds) router.refresh();
  }, [router, state.errors?.topicIds, state.errors?.strategicLineIds]);

  useEffect(() => {
    if (state.formError) {
      notify.error({ title: state.formError });
      return;
    }
    const firstFieldError = Object.values(state.errors ?? {}).flat()[0] ?? null;
    if (firstFieldError) {
      notify.error({ title: firstFieldError });
    }
  }, [state]);

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn(
          'text-foreground flex min-h-0 w-full min-w-0 flex-1 flex-col',
          isEditing ? 'bg-surface-page' : 'bg-muted/30'
        )}
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSubmit(event);
        }}
      >
        {!isEditing && defaultValues.coverPhotoUrl && (
          <input type="hidden" name="projectPlaceholder" value={defaultValues.coverPhotoUrl} />
        )}
        {cover.removedPlaceholder && (
          <>
            <input type="hidden" name="removeCoverPhoto" value="true" />
            <input type="hidden" name="projectPlaceholder" value={cover.removedPlaceholder} />
          </>
        )}
        <div
          className={cn(
            'mx-auto grid w-full max-w-[1185px] flex-1 content-start items-start',
            isEditing
              ? 'lg:grid-cols-[minmax(0,152fr)_minmax(0,85fr)]'
              : 'lg:grid-cols-[minmax(0,16fr)_minmax(0,9fr)]'
          )}
        >
          <div
            className={cn(
              'flex min-w-0 flex-col gap-5 px-4 pt-6 pb-8 sm:px-6',
              !isEditing && 'lg:pb-20'
            )}
          >
            <BasicInfoSection
              yearOptions={yearOptions}
              coordinatorOptions={coordinatorOptions}
              topics={topics}
              strategicLines={strategicLines}
              canSelectCoordinator={canSelectCoordinator}
            />

            <TerritorySection
              isEditing={isEditing}
              departmentOptions={departmentOptions}
              coverageLabel={coverageLabel}
            />

            <BeneficiariesSection
              isEditing={isEditing}
              yearOptions={beneficiaryYearOptions}
              beneficiaryRecords={beneficiaryRecords}
              beneficiaryCategories={beneficiaryCategories}
            />

            <PublicInfoSection
              coverFile={cover.file}
              imageUrl={cover.fieldImageUrl}
              onCoverFileChange={cover.changeFile}
              onRemoveSavedCover={cover.canRemove ? cover.remove : undefined}
            />

            <VisibilitySection />

            <InternalNotesSection isEditing={isEditing} />
            {children}
          </div>

          <ProjectPreview
            values={values}
            locationLabel={locationLabel}
            beneficiaryTotal={beneficiaryTotal}
          />
        </div>

        <FormActions
          onCancel={() => router.push(cancelHref)}
          submitLabel="Guardar cambios"
          pending={busy}
        />
      </form>
    </FormProvider>
  );
}
