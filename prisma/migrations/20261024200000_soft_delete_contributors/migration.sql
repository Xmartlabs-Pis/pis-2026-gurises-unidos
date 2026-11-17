ALTER TABLE "Contributor" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "Contributor_name_key";
DROP INDEX "Contributor_name_case_insensitive_key";

CREATE UNIQUE INDEX "Contributor_name_case_insensitive_key"
ON "Contributor"(lower("name")) WHERE "deletedAt" IS NULL;
