ALTER TABLE "Topic" ADD COLUMN "showPublicly" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Topic" AS topic
SET "showPublicly" = metric."showPublicly"
FROM "Metric" AS metric
WHERE metric."key" = 'topic_projects_' || topic."id"::text;

DELETE FROM "Metric" WHERE "key" ~ '^topic_projects_[0-9]+$';

ALTER TYPE "AuditEntity" ADD VALUE 'topic';
