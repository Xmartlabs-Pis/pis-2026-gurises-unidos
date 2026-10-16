BEGIN;

LOCK TABLE "Project" IN ACCESS EXCLUSIVE MODE;

CREATE TABLE "_ProjectToTopic" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ProjectToTopic_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_ProjectToTopic_B_index" ON "_ProjectToTopic"("B");

ALTER TABLE "_ProjectToTopic" ADD CONSTRAINT "_ProjectToTopic_A_fkey"
FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProjectToTopic" ADD CONSTRAINT "_ProjectToTopic_B_fkey"
FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_ProjectToTopic" ("A", "B")
SELECT "id", "topicId" FROM "Project";

ALTER TABLE "Project" DROP CONSTRAINT "Project_topicId_fkey";
ALTER TABLE "Project" DROP COLUMN "topicId";

COMMIT;
