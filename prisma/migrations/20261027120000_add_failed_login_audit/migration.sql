ALTER TYPE "AuditAction" ADD VALUE 'loginFailure';
ALTER TYPE "AuditEntity" ADD VALUE 'authentication';

ALTER TABLE "AuditLog" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "entityId" DROP NOT NULL;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_event_fields_check" CHECK (
    (
        "action"::text = 'loginFailure'
        AND "entity"::text = 'authentication'
        AND "authorId" IS NULL
        AND "entityId" IS NULL
        AND COALESCE(
            jsonb_typeof("details") = 'object'
            AND "details"->>'documentId' ~ '^[0-9]{7,8}$'
            AND "details"->>'reason' IN ('invalidCredentials', 'blocked'),
            false
        )
    )
    OR (
        "action"::text <> 'loginFailure'
        AND "entity"::text <> 'authentication'
        AND "authorId" IS NOT NULL
        AND "entityId" IS NOT NULL
    )
);

CREATE INDEX "AuditLog_action_occurredAt_idx" ON "AuditLog"("action", "occurredAt");
