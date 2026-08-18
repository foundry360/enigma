ALTER TABLE "Assessment"
  ADD COLUMN "connectionId" TEXT,
  ADD COLUMN "summary" JSONB;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AssessmentTrace" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "apiName" TEXT,
  "ok" BOOLEAN NOT NULL,
  "summary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentTrace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentJudgment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "evidence" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "risk" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentJudgment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssessmentTrace_tenantId_idx" ON "AssessmentTrace"("tenantId");
CREATE INDEX "AssessmentTrace_assessmentId_idx" ON "AssessmentTrace"("assessmentId");
CREATE INDEX "AssessmentJudgment_tenantId_idx" ON "AssessmentJudgment"("tenantId");
CREATE INDEX "AssessmentJudgment_assessmentId_idx" ON "AssessmentJudgment"("assessmentId");

ALTER TABLE "AssessmentTrace"
  ADD CONSTRAINT "AssessmentTrace_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentJudgment"
  ADD CONSTRAINT "AssessmentJudgment_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentTrace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssessmentJudgment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AssessmentTrace" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "AssessmentJudgment" FROM anon, authenticated, PUBLIC;
