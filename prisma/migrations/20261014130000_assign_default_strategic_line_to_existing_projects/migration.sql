INSERT INTO "_ProjectToStrategicLine" ("A", "B")
SELECT project."id", strategic_line."id"
FROM "Project" AS project
CROSS JOIN LATERAL (
    SELECT "id"
    FROM "StrategicLine"
    WHERE "isActive" = true
    ORDER BY lower("name"), "id"
    LIMIT 1
) AS strategic_line
WHERE NOT EXISTS (
    SELECT 1
    FROM "_ProjectToStrategicLine" AS relation
    WHERE relation."A" = project."id"
)
ON CONFLICT ("A", "B") DO NOTHING;
