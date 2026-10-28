import type { AuditAction, AuditEntity } from '@/generated/prisma/enums';
import { FormSection } from '@/components/ui/forms/form-section';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { PROJECT_FIELD_LABELS, PROJECT_TEXT_CHANGE_LABELS } from '@/lib/audit-log/constants';
import { formatAuditValue, PROJECT_VALUE_LABELS } from '@/lib/audit-log/format';

type ProjectHistoryProps = {
  entries: {
    id: number;
    action: AuditAction;
    entity: AuditEntity;
    details: Prisma.JsonValue | null;
    occurredAt: Date;
    author: { firstName: string; lastName: string };
  }[];
  fieldLabels: Record<string, string>;
};

const PROJECT_ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  creation: 'creó el proyecto',
  update: 'actualizó el proyecto',
  deletion: 'eliminó el proyecto',
};

const BENEFICIARY_ACTION_LABEL = 'actualizó el número de beneficiarios';

const namedValueSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const auditValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  namedValueSchema,
  z.array(namedValueSchema),
]);

const projectDetailsSchema = z.object({
  changes: z
    .array(
      z.object({
        field: z.string(),
        from: auditValueSchema,
        to: auditValueSchema,
      })
    )
    .optional(),
});

const beneficiaryDetailsSchema = z.object({
  year: z.number(),
  changes: z
    .array(
      z.object({
        field: z.string(),
        from: z.number(),
        to: z.number(),
      })
    )
    .optional(),
});

type AuditValue = z.infer<typeof auditValueSchema>;

type AuditChange = {
  field: string;
  from: AuditValue;
  to: AuditValue;
};

function describeEntry(
  entry: ProjectHistoryProps['entries'][number]
): { label: string; changes: AuditChange[] } | null {
  if (entry.entity === 'project') {
    const label = PROJECT_ACTION_LABELS[entry.action];

    if (!label) return null;

    const details = projectDetailsSchema.safeParse(entry.details);

    return {
      label,
      changes: details.success ? (details.data.changes ?? []) : [],
    };
  }

  if (entry.entity !== 'beneficiary') return null;

  const details = beneficiaryDetailsSchema.safeParse(entry.details);

  if (!details.success || !details.data.changes?.length) return null;

  return {
    label: `${BENEFICIARY_ACTION_LABEL} de ${details.data.year}`,
    changes: details.data.changes,
  };
}

export function ProjectHistory({ entries, fieldLabels }: ProjectHistoryProps) {
  const described = entries.flatMap((entry) => {
    const description = describeEntry(entry);

    return description ? [{ entry, ...description }] : [];
  });

  return (
    <FormSection
      title="Historial"
      description="Últimas modificaciones"
      descriptionSpacing="relaxed"
    >
      {described.length === 0 ? (
        <p className="text-muted-foreground text-sm">Todavía no hay modificaciones registradas.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <ol className="ml-1 space-y-[18px] border-l-2 pl-[18px]">
            {described.map(({ entry, label, changes }) => (
              <li key={entry.id} className="relative text-sm leading-5">
                <span className="bg-history-marker absolute top-1.5 -left-6 size-2.5 rounded-full" />

                <time
                  dateTime={entry.occurredAt.toISOString()}
                  className="text-muted-foreground font-medium"
                >
                  {entry.occurredAt.toLocaleDateString('es-UY', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'America/Montevideo',
                  })}
                </time>

                <p className="mt-[3px]">
                  {entry.author.firstName} {entry.author.lastName} {label}
                </p>

                {changes.length > 0 && (
                  <ul className="text-muted-foreground mt-1 space-y-0.5">
                    {changes.map((change) => {
                      const isProject = entry.entity === 'project';
                      const labels = isProject ? PROJECT_FIELD_LABELS : fieldLabels;
                      const fieldLabel = labels[change.field] ?? change.field;
                      const valueLabels = isProject ? PROJECT_VALUE_LABELS : {};
                      const from = formatAuditValue(change.field, change.from, valueLabels);
                      const to = formatAuditValue(change.field, change.to, valueLabels);
                      const textChangeLabel = isProject
                        ? PROJECT_TEXT_CHANGE_LABELS[change.field]
                        : undefined;

                      return (
                        <li key={change.field} className="break-words whitespace-pre-wrap">
                          {typeof textChangeLabel === 'string' ? (
                            <details>
                              <summary className="cursor-pointer font-medium">
                                {fieldLabel}: {textChangeLabel}
                              </summary>
                              <dl className="mt-1 space-y-2">
                                <div>
                                  <dt className="text-foreground text-xs font-medium">Antes</dt>
                                  <dd className="mt-0.5">{from}</dd>
                                </div>
                                <div>
                                  <dt className="text-foreground text-xs font-medium">Después</dt>
                                  <dd className="mt-0.5">{to}</dd>
                                </div>
                              </dl>
                            </details>
                          ) : (
                            <>
                              {fieldLabel}: {from} → {to}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </FormSection>
  );
}
