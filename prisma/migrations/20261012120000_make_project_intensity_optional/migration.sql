-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "intensity" DROP NOT NULL;

UPDATE "Project" AS p
SET "intensity" = NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectBeneficiary" AS pb
  JOIN "ProjectBeneficiaryValue" AS v ON v."beneficiaryId" = pb."id"
  JOIN "BeneficiaryCategory" AS c ON c."id" = v."categoryId"
  WHERE pb."projectId" = p."id"
    AND c."key" = 'directChildrenAdolescents'
    AND v."value" > 0
);
