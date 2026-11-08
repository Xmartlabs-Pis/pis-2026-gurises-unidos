ALTER TABLE "Contributor" RENAME TO "Partner";
ALTER TABLE "Partner" RENAME CONSTRAINT "Contributor_pkey" TO "Partner_pkey";
ALTER SEQUENCE "Contributor_id_seq" RENAME TO "Partner_id_seq";
ALTER INDEX "Contributor_name_case_insensitive_key" RENAME TO "Partner_name_case_insensitive_key";
ALTER TYPE "AuditEntity" RENAME VALUE 'contributor' TO 'partner';