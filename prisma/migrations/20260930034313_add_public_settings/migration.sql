-- CreateTable
CREATE TABLE "PublicSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "referenceYear" INTEGER NOT NULL,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PublicSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PublicSettings" ADD CONSTRAINT "PublicSettings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
