-- AlterEnum
CREATE TYPE "ProjectStatus_new" AS ENUM ('active', 'closed');
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING (
  CASE "status"::text
    WHEN 'paused' THEN 'active'
    ELSE "status"::text
  END::"ProjectStatus_new"
);
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";
