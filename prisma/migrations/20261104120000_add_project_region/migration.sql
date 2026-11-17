-- CreateEnum
CREATE TYPE "Region" AS ENUM ('southAmerica', 'northAmerica', 'centralAmerica', 'otherRegions');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "region" "Region";

UPDATE "Project"
SET "region" = CASE lower(public.immutable_unaccent(trim(coalesce("countries"[1], ''))))
  WHEN 'argentina' THEN 'southAmerica'
  WHEN 'bolivia' THEN 'southAmerica'
  WHEN 'brasil' THEN 'southAmerica'
  WHEN 'brazil' THEN 'southAmerica'
  WHEN 'chile' THEN 'southAmerica'
  WHEN 'colombia' THEN 'southAmerica'
  WHEN 'ecuador' THEN 'southAmerica'
  WHEN 'guyana' THEN 'southAmerica'
  WHEN 'paraguay' THEN 'southAmerica'
  WHEN 'peru' THEN 'southAmerica'
  WHEN 'surinam' THEN 'southAmerica'
  WHEN 'suriname' THEN 'southAmerica'
  WHEN 'uruguay' THEN 'southAmerica'
  WHEN 'venezuela' THEN 'southAmerica'
  WHEN 'canada' THEN 'northAmerica'
  WHEN 'estados unidos' THEN 'northAmerica'
  WHEN 'eeuu' THEN 'northAmerica'
  WHEN 'ee.uu.' THEN 'northAmerica'
  WHEN 'usa' THEN 'northAmerica'
  WHEN 'mexico' THEN 'northAmerica'
  WHEN 'belice' THEN 'centralAmerica'
  WHEN 'costa rica' THEN 'centralAmerica'
  WHEN 'el salvador' THEN 'centralAmerica'
  WHEN 'guatemala' THEN 'centralAmerica'
  WHEN 'honduras' THEN 'centralAmerica'
  WHEN 'nicaragua' THEN 'centralAmerica'
  WHEN 'panama' THEN 'centralAmerica'
  ELSE 'otherRegions'
END::"Region"
WHERE "geographicScope" = 'international' AND "region" IS NULL;
