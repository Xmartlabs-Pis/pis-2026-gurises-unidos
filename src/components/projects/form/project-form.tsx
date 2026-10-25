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

type ProjectFormProps = {
  mode?: 'create' | 'edit';
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

export function ProjectForm({
  mode = 'create',
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
  const [state, formAction, pending] = useActionState(submitAction, INITIAL_STATE);
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
    coverPhotoUrl: defaultValues.coverPhotoUrl ?? null,
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
      () => {
        startTransition(() => {
          formAction(new FormData(formElement));
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
        aria-busy={pending}
        onSubmit={onSubmit}
      >
        {!isEditing && values.coverPhotoUrl && (
          <input type="hidden" name="projectPlaceholder" value={values.coverPhotoUrl} />
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

            <PublicInfoSection />

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
          pending={pending}
        />
      </form>
    </FormProvider>
  );
}
