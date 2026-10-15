INSERT INTO "Metric" ("key", "name", "showPublicly", "showPubliclyDraft", "sortOrder", "updatedBy", "updatedAt")
SELECT split."key", split."name", metric."showPublicly", metric."showPubliclyDraft", split."sortOrder", metric."updatedBy", metric."updatedAt"
FROM "Metric" AS metric
CROSS JOIN (
  VALUES
    ('direct_children_reached', 'NNA directos', 1),
    ('indirect_children_reached', 'NNA indirectos', 2)
) AS split ("key", "name", "sortOrder")
WHERE metric."key" = 'children_reached'
ON CONFLICT ("key") DO NOTHING;

DELETE FROM "Metric" WHERE "key" = 'children_reached';
