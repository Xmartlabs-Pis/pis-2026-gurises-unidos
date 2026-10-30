-- DropIndex
DROP INDEX "Project_name_startYear_key";

DROP INDEX "Project_name_lower_startYear_key";
CREATE UNIQUE INDEX "Project_name_lower_startYear_key" ON "Project" (lower("name"), "startYear") WHERE "deletedAt" IS NULL;
