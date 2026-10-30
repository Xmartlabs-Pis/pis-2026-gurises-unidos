CREATE TABLE "StrategicLine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StrategicLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_ProjectToStrategicLine" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ProjectToStrategicLine_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE UNIQUE INDEX "StrategicLine_name_key" ON "StrategicLine"("name");
CREATE INDEX "_ProjectToStrategicLine_B_index" ON "_ProjectToStrategicLine"("B");

ALTER TABLE "_ProjectToStrategicLine" ADD CONSTRAINT "_ProjectToStrategicLine_A_fkey"
FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProjectToStrategicLine" ADD CONSTRAINT "_ProjectToStrategicLine_B_fkey"
FOREIGN KEY ("B") REFERENCES "StrategicLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
