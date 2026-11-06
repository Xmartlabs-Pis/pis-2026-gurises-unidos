ALTER TABLE "Partner"
ADD COLUMN "counterpartyType" "CounterpartyType",
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showPublicly" BOOLEAN NOT NULL DEFAULT true;

DELETE FROM "Partner" WHERE "deletedAt" IS NOT NULL;

UPDATE "Partner" SET "counterpartyType" = 'publicSector'
WHERE lower("name") IN ('inau', 'inefop', 'anep', 'ministerio del interior');

UPDATE "Partner" SET "counterpartyType" = 'privateSector'
WHERE lower("name") IN ('fundación telefónica', 'fundación upm', 'pepsico', 'basf', 'reaching u');

UPDATE "Partner" SET "counterpartyType" = 'internationalCooperation'
WHERE lower("name") IN ('unfpa', 'osf');

ALTER TABLE "Partner" ALTER COLUMN "counterpartyType" SET NOT NULL;

DROP INDEX "Partner_name_case_insensitive_key";
ALTER TABLE "Partner" DROP COLUMN "deletedAt";

CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");
CREATE UNIQUE INDEX "Partner_name_lower_key" ON "Partner" (lower("name"));

CREATE TABLE "_PartnerToProject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PartnerToProject_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_PartnerToProject_B_index" ON "_PartnerToProject"("B");

ALTER TABLE "_PartnerToProject" ADD CONSTRAINT "_PartnerToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PartnerToProject" ADD CONSTRAINT "_PartnerToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;