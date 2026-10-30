CREATE TYPE "GeographicScope" AS ENUM ('national', 'international');

ALTER TABLE "Project"
ADD COLUMN "geographicScope" "GeographicScope" NOT NULL DEFAULT 'national',
ADD COLUMN "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "neighborhoods" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "_DepartmentToProject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_DepartmentToProject_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_DepartmentToProject_B_index" ON "_DepartmentToProject"("B");

ALTER TABLE "_DepartmentToProject" ADD CONSTRAINT "_DepartmentToProject_A_fkey"
FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DepartmentToProject" ADD CONSTRAINT "_DepartmentToProject_B_fkey"
FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_DepartmentToProject" ("A", "B")
SELECT "departmentId", "id" FROM "Project";

UPDATE "Project"
SET "cities" = ARRAY[btrim("localityNeighborhood")]
WHERE btrim(COALESCE("localityNeighborhood", '')) <> '';

ALTER TABLE "Project" DROP CONSTRAINT "Project_departmentId_fkey";

ALTER TABLE "Project"
DROP COLUMN "departmentId",
DROP COLUMN "localityNeighborhood";
