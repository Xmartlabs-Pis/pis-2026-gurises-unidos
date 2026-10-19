-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'beneficiaryCategory';

-- CreateTable
CREATE TABLE "BeneficiaryCategory" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultValue" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "BeneficiaryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBeneficiaryValue" (
    "beneficiaryId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectBeneficiaryValue_pkey" PRIMARY KEY ("beneficiaryId","categoryId"),
    CONSTRAINT "chk_beneficiary_value_non_negative" CHECK ("value" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "BeneficiaryCategory_key_key" ON "BeneficiaryCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BeneficiaryCategory_name_key" ON "BeneficiaryCategory"("name");

-- CreateIndex
CREATE INDEX "ProjectBeneficiaryValue_categoryId_idx" ON "ProjectBeneficiaryValue"("categoryId");

-- AddForeignKey
ALTER TABLE "BeneficiaryCategory" ADD CONSTRAINT "BeneficiaryCategory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBeneficiaryValue" ADD CONSTRAINT "ProjectBeneficiaryValue_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "ProjectBeneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBeneficiaryValue" ADD CONSTRAINT "ProjectBeneficiaryValue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BeneficiaryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "BeneficiaryCategory" ("key", "name", "sortOrder", "isSystem")
VALUES
  ('directChildrenAdolescents', 'NNA directos', 1, true),
  ('indirectChildrenAdolescents', 'NNA indirectos', 2, true),
  ('youth18To29', 'Jóvenes (18 a 29)', 3, true),
  ('families', 'Familias', 4, true),
  ('coordinatedInstitutions', 'Instituciones coordinadas', 5, true),
  ('communityLeaders', 'Referentes comunitarios', 6, true),
  ('basicServiceStaff', 'Personal de servicios básicos', 7, true);

INSERT INTO "ProjectBeneficiaryValue" ("beneficiaryId", "categoryId", "value")
SELECT b."id", c."id", v."value"
FROM "ProjectBeneficiary" b
CROSS JOIN LATERAL (VALUES
  ('directChildrenAdolescents', b."directChildrenAdolescents"),
  ('indirectChildrenAdolescents', b."indirectChildrenAdolescents"),
  ('youth18To29', b."youth18To29"),
  ('families', b."families"),
  ('coordinatedInstitutions', b."coordinatedInstitutions"),
  ('communityLeaders', b."communityLeaders"),
  ('basicServiceStaff', b."basicServiceStaff")
) AS v("key", "value")
JOIN "BeneficiaryCategory" c ON c."key" = v."key"
WHERE v."value" > 0;

-- AlterTable
ALTER TABLE "ProjectBeneficiary" DROP CONSTRAINT "chk_beneficiaries_non_negative";

-- AlterTable
ALTER TABLE "ProjectBeneficiary" DROP COLUMN "basicServiceStaff",
DROP COLUMN "communityLeaders",
DROP COLUMN "coordinatedInstitutions",
DROP COLUMN "directChildrenAdolescents",
DROP COLUMN "families",
DROP COLUMN "indirectChildrenAdolescents",
DROP COLUMN "youth18To29";
