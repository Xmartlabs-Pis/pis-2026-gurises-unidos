ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_event_fields_check";

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
        AND (
            "entityId" IS NOT NULL
            OR (
                "action"::text = 'update'
                AND "entity"::text IN ('metric', 'topic', 'partner')
            )
        )
    )
);
