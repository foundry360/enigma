ALTER TABLE "PlatformConnection"
  ADD COLUMN "instanceUrl" TEXT;

CREATE TABLE "ConnectionSecret" (
  "connectionId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "refreshTokenCiphertext" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConnectionSecret_pkey" PRIMARY KEY ("connectionId")
);

CREATE INDEX "ConnectionSecret_tenantId_idx" ON "ConnectionSecret"("tenantId");

ALTER TABLE "ConnectionSecret"
  ADD CONSTRAINT "ConnectionSecret_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConnectionSecret" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConnectionSecret" FROM anon, authenticated, PUBLIC;
