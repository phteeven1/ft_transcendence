-- Rename duplicate vocabulary names within a group so the unique index can be added.
UPDATE "Vocabulary" AS v
SET name = v.name || ' (' || d.dup_n || ')'
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "inGroupId", name ORDER BY id) AS dup_n
  FROM "Vocabulary"
) AS d
WHERE v.id = d.id AND d.dup_n > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_inGroupId_name_key" ON "Vocabulary"("inGroupId", "name");
