'use client';

import { InternalNotesSection } from './sections/internal-notes-section';
import { PublicInfoSection } from './sections/public-info-section';
import { VisibilitySection } from './sections/visibility-section';
import { BeneficiariesSection } from './sections/beneficiaries-section';
import { TerritorySection } from './sections/territory-section';
import { BasicInfoSection } from './sections/basic-info-section';

import { useEffect, useMemo, useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { useSaveAction } from '@/hooks/use-save-action';
import { usePendingChanges } from '@/components/ui/forms/pending-changes-provider';
import { getProjectDetailsSignature } from './project-form-signature';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'cn';
import type { ProjectPartnerOption } from '@/lib/partners';
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
  partners: ProjectPartnerOption[];
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
  partners,
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
  const [defaultValues] = useState(() => ({
    ...getDefaultValues(currentYear, beneficiaryCategories),
    ...initialValues,
  }));
  const cover = useProjectCover(defaultValues.coverPhotoUrl ?? null, defaultValues.coverCrop);
  const [uploading, setUploading] = useState(false);
  const [state, submit, pending] = useSaveAction(
    submitAction,
    INITIAL_STATE,
    'No se pudo guardar el proyecto. Intentá de nuevo.'
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [hasBeneficiaryChanges, setHasBeneficiaryChanges] = useState(false);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ProjectFormValues>,
    defaultValues,
    mode: 'onChange',
  });
  const { control, handleSubmit } = form;
  const submissionRef = useRef(false);
  const busy = pending || uploading || form.formState.isSubmitting;
  const watchedValues = useWatch({ control });
  const values = {
    ...defaultValues,
    ...watchedValues,
    coverPhotoUrl: cover.previewUrl,
    coverCrop: cover.crop,
  } as ProjectFormValues;

  const { locationLabel, coverageLabel, beneficiaryTotal } = getPreviewLabels(
    values,
    departments,
    isEditing,
    beneficiaryCategories
  );

  const beneficiaryCountsByYear = new Map<string, Record<string, unknown>>(
    beneficiaryRecords.map((record) => [String(record.year), record])
  );
  for (const draft of values.beneficiaryDrafts) {
    beneficiaryCountsByYear.set(draft.year, draft);
  }
  beneficiaryCountsByYear.set(values.year, values);
  const populatedYears = [...beneficiaryCountsByYear]
    .filter(([, counts]) => beneficiaryCategories.some(({ key }) => Number(counts[key]) > 0))
    .map(([year]) => Number(year));
  const firstBeneficiaryYear = populatedYears.length ? Math.min(...populatedYears) : undefined;
  const lastBeneficiaryYear = populatedYears.length ? Math.max(...populatedYears) : undefined;
  const beneficiaryYearOptions = yearOptions.filter(
    ({ value }) =>
      populatedYears.includes(Number(value)) ||
      (Number(value) >= Number(values.startYear) &&
        (values.status !== 'inactive' ||
          !values.endYear ||
          Number(value) <= Number(values.endYear)))
  );

  const hasUnsavedChanges =
    isEditing &&
    (getProjectDetailsSignature(values, beneficiaryCategories) !==
      getProjectDetailsSignature(defaultValues, beneficiaryCategories) ||
      hasBeneficiaryChanges ||
      cover.hasUnsavedSelection ||
      cover.hasUnsavedCrop ||
      cover.removedPlaceholder !== null);

  const { runWithoutConfirmation } = usePendingChanges({
    hasUnsavedChanges,
    isSaving: isEditing && busy,
    onSave: saveChanges,
  });

  async function saveChanges(): Promise<boolean> {
    if (!formRef.current || submissionRef.current) return false;

    if (mode === 'create' && topics.length === 0) {
      form.setError('topicIds', {
        type: 'manual',
        message:
          'No hay temáticas disponibles. Un administrador debe crear o activar una antes de crear proyectos.',
      });
      return false;
    }

    submissionRef.current = true;
    const formElement = formRef.current;
    let saved = false;
    try {
      await handleSubmit(async () => {
        const data = new FormData(formElement);
        if (isEditing) data.set('returnResult', 'true');
        if (cover.file) {
          setUploading(true);
          try {
            const uploaded = await uploadProjectCover(cover.file, projectId);
            if (!uploaded.ok) {
              notify.error({ title: uploaded.error });
              return;
            }
            data.set('coverPhotoPath', uploaded.path);
          } catch {
            notify.error({ title: 'No se pudo subir la imagen.' });
            return;
          } finally {
            setUploading(false);
          }
        }
        saved = await submit(data);
      })();
      return saved;
    } finally {
      submissionRef.current = false;
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    void saveChanges().then((saved) => {
      if (saved && isEditing) runWithoutConfirmation(() => router.push(cancelHref));
    });
  }

  useEffect(() => {
    if (state.errors?.topicIds || state.errors?.strategicLineIds || state.errors?.partnerIds) {
      router.refresh();
    }
  }, [router, state.errors?.topicIds, state.errors?.strategicLineIds, state.errors?.partnerIds]);

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
        ref={formRef}
        noValidate
        className={cn(
          'text-foreground flex min-h-0 w-full min-w-0 flex-1 flex-col',
          isEditing ? 'bg-surface-page' : 'bg-muted/30'
        )}
        aria-busy={busy}
        onSubmit={onSubmit}
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
        {cover.existingPath && (
          <input type="hidden" name="coverPhotoPath" value={cover.existingPath} />
        )}
        {cover.cropDirty && cover.crop && (
          <input type="hidden" name="coverCrop" value={JSON.stringify(cover.crop)} />
        )}
        <div
          inert={busy}
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
              firstBeneficiaryYear={firstBeneficiaryYear}
              lastBeneficiaryYear={lastBeneficiaryYear}
              coordinatorOptions={coordinatorOptions}
              topics={topics}
              strategicLines={strategicLines}
              partners={partners}
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
              onUnsavedChangesChange={setHasBeneficiaryChanges}
            />

            <PublicInfoSection
              previewUrl={cover.previewUrl}
              crop={cover.crop}
              file={cover.file}
              canRemoveSaved={cover.canRemoveSaved}
              hasUnsavedSelection={cover.hasUnsavedSelection}
              hasUnsavedCrop={cover.hasUnsavedCrop}
              onApplyCover={cover.apply}
              onClearUnsavedCover={cover.clearUnsaved}
              onRemoveSavedCover={cover.canRemoveSaved ? cover.remove : undefined}
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
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </form>
    </FormProvider>
  );
}
