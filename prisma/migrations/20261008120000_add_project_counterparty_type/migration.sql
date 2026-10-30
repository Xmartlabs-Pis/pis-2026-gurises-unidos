BEGIN;

CREATE TYPE "CounterpartyType" AS ENUM ('publicSector', 'privateSector', 'internationalCooperation');

ALTER TABLE "Project" ADD COLUMN "counterpartyType" "CounterpartyType";

UPDATE "Project"
SET "counterpartyType" = 'publicSector'
WHERE "counterpartyType" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "counterpartyType" SET NOT NULL;

COMMIT;