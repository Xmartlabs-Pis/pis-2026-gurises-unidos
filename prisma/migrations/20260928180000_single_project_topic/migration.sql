BEGIN;

LOCK TABLE "Project", "ProjectTopic" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "Project" ADD COLUMN "topicId" INTEGER;

UPDATE "Project" p
SET "topicId" = pt."topicId"
FROM (
  SELECT "projectId", MIN("topicId") AS "topicId"
  FROM "ProjectTopic"
  GROUP BY "projectId"
) pt
WHERE pt."projectId" = p."id";

ALTER TABLE "Project"
ADD CONSTRAINT "Project_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "Topic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "ProjectTopic";

COMMIT;
