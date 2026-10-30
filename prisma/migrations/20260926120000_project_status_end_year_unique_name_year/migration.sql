/*
  Warnings:

  - The values [inProgress,completed,archived] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[name,startYear]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
CREATE TYPE "ProjectStatus_new" AS ENUM ('active', 'paused', 'closed');
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING (
  CASE "status"::text
    WHEN 'active' THEN 'active'
    WHEN 'inProgress' THEN 'active'
    WHEN 'archived' THEN 'paused'
    WHEN 'completed' THEN 'closed'
  END::"ProjectStatus_new"
);
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "endYear" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_startYear_key" ON "Project"("name", "startYear");
