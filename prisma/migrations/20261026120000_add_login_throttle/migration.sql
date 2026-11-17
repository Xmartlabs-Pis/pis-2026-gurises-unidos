CREATE TABLE "LoginThrottle" (
    "documentId" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("documentId")
);
