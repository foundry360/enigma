CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platformType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_platformType_check" CHECK (
        "platformType" IN ('SALESFORCE', 'PEGA', 'SERVICENOW')
    )
);

CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

ALTER TABLE "Project"
    ADD CONSTRAINT "Project_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project"
    ADD CONSTRAINT "Project_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Project" FROM anon, authenticated, PUBLIC;
