CREATE TABLE "OpportunityCandidate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "judgmentId" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "candidateType" TEXT NOT NULL,
  "businessArea" TEXT NOT NULL,
  "businessProcess" TEXT NOT NULL,
  "recommendedCapability" TEXT NOT NULL,
  "supportingSignals" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "finding" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "consumptionDrivers" JSONB NOT NULL,
  "valueDrivers" JSONB NOT NULL,
  "constraints" JSONB NOT NULL,
  "dependencies" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'candidate',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "promotedAt" TIMESTAMP(3),
  "promotedBy" TEXT,
  CONSTRAINT "OpportunityCandidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpportunityCandidate_status_check" CHECK (
    "status" IN ('candidate', 'validated', 'rejected', 'promoted')
  ),
  CONSTRAINT "OpportunityCandidate_confidence_check" CHECK (
    "confidence" IN ('high', 'medium', 'low')
  )
);

CREATE TABLE "ProjectOpportunity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "businessArea" TEXT NOT NULL,
  "businessProcess" TEXT NOT NULL,
  "recommendedCapability" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpportunityCandidate_assessmentId_key_idx"
  ON "OpportunityCandidate"("assessmentId", "key");
CREATE INDEX "OpportunityCandidate_tenantId_idx" ON "OpportunityCandidate"("tenantId");
CREATE INDEX "OpportunityCandidate_projectId_idx" ON "OpportunityCandidate"("projectId");
CREATE INDEX "ProjectOpportunity_tenantId_idx" ON "ProjectOpportunity"("tenantId");
CREATE INDEX "ProjectOpportunity_projectId_idx" ON "ProjectOpportunity"("projectId");
CREATE UNIQUE INDEX "ProjectOpportunity_candidateId_idx" ON "ProjectOpportunity"("candidateId");

ALTER TABLE "OpportunityCandidate"
  ADD CONSTRAINT "OpportunityCandidate_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityCandidate"
  ADD CONSTRAINT "OpportunityCandidate_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectOpportunity"
  ADD CONSTRAINT "ProjectOpportunity_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectOpportunity"
  ADD CONSTRAINT "ProjectOpportunity_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "OpportunityCandidate"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectOpportunity"
  ADD CONSTRAINT "ProjectOpportunity_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectOpportunity" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "OpportunityCandidate" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "ProjectOpportunity" FROM anon, authenticated, PUBLIC;
