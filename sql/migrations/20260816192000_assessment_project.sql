ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

CREATE INDEX IF NOT EXISTS "Assessment_projectId_idx" ON "Assessment"("projectId");

ALTER TABLE "Assessment"
    ADD CONSTRAINT "Assessment_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
