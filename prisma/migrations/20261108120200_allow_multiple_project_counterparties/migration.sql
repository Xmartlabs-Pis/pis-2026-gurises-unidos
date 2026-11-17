ALTER TABLE "Project" ADD COLUMN "counterpartyTypes" "CounterpartyType"[];

UPDATE "Project" SET "counterpartyTypes" = ARRAY["counterpartyType"];

ALTER TABLE "Project" DROP COLUMN "counterpartyType";
