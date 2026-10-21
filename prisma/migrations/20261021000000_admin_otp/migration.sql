-- Emailed one-time codes for admin sign-in, password reset, and settings changes.
CREATE TABLE "AdminOtp" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "pendingPasswordHash" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminOtp_tokenHash_key" ON "AdminOtp"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminOtp_adminId_purpose_idx" ON "AdminOtp"("adminId", "purpose");

-- CreateIndex
CREATE INDEX "AdminOtp_expiresAt_idx" ON "AdminOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "AdminOtp" ADD CONSTRAINT "AdminOtp_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
