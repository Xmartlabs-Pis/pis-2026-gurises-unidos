/*
  Warnings:

  - You are about to alter the column `name` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `localityNeighborhood` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `generalObjective` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `internalNotes` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.

*/
-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "localityNeighborhood" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "generalObjective" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "publicDescription" SET DATA TYPE VARCHAR(1000),
ALTER COLUMN "internalNotes" SET DATA TYPE VARCHAR(1000);
