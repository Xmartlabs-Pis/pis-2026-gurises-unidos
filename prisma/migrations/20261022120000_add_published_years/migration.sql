ALTER TABLE "PublicSettings" ADD COLUMN "publishedYears" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "PublicSettings" SET "publishedYears" = ARRAY["referenceYear"];
