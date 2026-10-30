UPDATE "Project" AS p
SET "endYear" = GREATEST(
  p."startYear",
  (SELECT MAX(b."year") FROM "ProjectBeneficiary" AS b WHERE b."projectId" = p."id")
)
WHERE p."status" = 'closed'
  AND p."endYear" IS NULL;
