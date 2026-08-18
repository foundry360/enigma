CREATE TABLE "BusinessCase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "scenario" TEXT NOT NULL DEFAULT 'expected',
  "monthsAccelerated" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessCase_scenario_check" CHECK (
    "scenario" IN ('conservative', 'expected', 'aggressive')
  )
);

CREATE UNIQUE INDEX "BusinessCase_projectId_idx" ON "BusinessCase"("projectId");
CREATE INDEX "BusinessCase_tenantId_idx" ON "BusinessCase"("tenantId");

ALTER TABLE "BusinessCase"
  ADD CONSTRAINT "BusinessCase_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessCase"
  ADD CONSTRAINT "BusinessCase_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BusinessCaseLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "businessCaseId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "annualVolume" DOUBLE PRECISION,
  "unitPrice" DOUBLE PRECISION,
  "hoursSavedPerUnit" DOUBLE PRECISION,
  "hourlyCost" DOUBLE PRECISION,
  "implementationCost" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessCaseLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessCaseLine_opportunityId_idx"
  ON "BusinessCaseLine"("opportunityId");
CREATE INDEX "BusinessCaseLine_tenantId_idx" ON "BusinessCaseLine"("tenantId");
CREATE INDEX "BusinessCaseLine_businessCaseId_idx"
  ON "BusinessCaseLine"("businessCaseId");

ALTER TABLE "BusinessCaseLine"
  ADD CONSTRAINT "BusinessCaseLine_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessCaseLine"
  ADD CONSTRAINT "BusinessCaseLine_businessCaseId_fkey"
  FOREIGN KEY ("businessCaseId") REFERENCES "BusinessCase"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessCaseLine"
  ADD CONSTRAINT "BusinessCaseLine_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "ProjectOpportunity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessCaseLine" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BusinessCase" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "BusinessCaseLine" FROM anon, authenticated, PUBLIC;
