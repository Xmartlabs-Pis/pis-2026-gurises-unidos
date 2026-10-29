CREATE TABLE "ProjectLocality" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "neighborhood" VARCHAR(100),

    CONSTRAINT "ProjectLocality_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectLocality_projectId_idx" ON "ProjectLocality"("projectId");

CREATE INDEX "ProjectLocality_departmentId_idx" ON "ProjectLocality"("departmentId");

ALTER TABLE "ProjectLocality" ADD CONSTRAINT "ProjectLocality_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectLocality" ADD CONSTRAINT "ProjectLocality_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ProjectLocality" ("projectId", "departmentId", "city", "neighborhood")
SELECT "project"."id", "department"."id", "city"."name", "neighborhood"."name"
FROM "Project" AS "project"
CROSS JOIN LATERAL (
    SELECT MIN("A") AS "id" FROM "_DepartmentToProject" WHERE "B" = "project"."id"
) AS "department"
CROSS JOIN LATERAL unnest("project"."cities") WITH ORDINALITY AS "city"("name", "position")
LEFT JOIN LATERAL unnest(
    CASE WHEN "city"."position" = 1 THEN "project"."neighborhoods" END
) WITH ORDINALITY AS "neighborhood"("name", "position") ON TRUE
WHERE "department"."id" IS NOT NULL
ORDER BY "project"."id", "city"."position", "neighborhood"."position";

INSERT INTO "ProjectLocality" ("projectId", "departmentId", "city")
SELECT "link"."B", "link"."A", "department"."name"
FROM "_DepartmentToProject" AS "link"
JOIN "Department" AS "department" ON "department"."id" = "link"."A"
WHERE NOT EXISTS (
    SELECT 1 FROM "ProjectLocality" AS "locality"
    WHERE "locality"."projectId" = "link"."B" AND "locality"."departmentId" = "link"."A"
)
ORDER BY "link"."B", "department"."name";

ALTER TABLE "Project"
DROP COLUMN "cities",
DROP COLUMN "neighborhoods";
