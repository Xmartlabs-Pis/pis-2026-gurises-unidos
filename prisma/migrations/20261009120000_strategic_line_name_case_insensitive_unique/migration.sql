-- Consolidate strategic lines that differ only by letter case before enforcing uniqueness.
WITH ranked AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY lower("name")
            ORDER BY "isActive" DESC, "id" ASC
        ) AS "canonicalId"
    FROM "StrategicLine"
), duplicates AS (
    SELECT "id" AS "duplicateId", "canonicalId"
    FROM ranked
    WHERE "id" <> "canonicalId"
)
INSERT INTO "_ProjectToStrategicLine" ("A", "B")
SELECT relation."A", duplicates."canonicalId"
FROM "_ProjectToStrategicLine" AS relation
JOIN duplicates ON relation."B" = duplicates."duplicateId"
ON CONFLICT ("A", "B") DO NOTHING;

WITH ranked AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY lower("name")
            ORDER BY "isActive" DESC, "id" ASC
        ) AS "canonicalId"
    FROM "StrategicLine"
)
DELETE FROM "StrategicLine"
WHERE "id" IN (
    SELECT "id"
    FROM ranked
    WHERE "id" <> "canonicalId"
);

CREATE UNIQUE INDEX "StrategicLine_name_lower_key" ON "StrategicLine" (lower("name"));
