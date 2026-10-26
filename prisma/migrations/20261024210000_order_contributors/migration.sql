ALTER TABLE "Contributor" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Contributor" SET "sortOrder" = "id";
