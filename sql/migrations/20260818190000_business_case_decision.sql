ALTER TABLE "BusinessCase"
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "conservativeAdoption" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS "expectedAdoption" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS "aggressiveAdoption" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS "baselineDays" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "enigmaDays" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "predictedSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "recommendationState" TEXT,
  ADD COLUMN IF NOT EXISTS "recommendationNarrative" TEXT,
  ADD COLUMN IF NOT EXISTS "intelligenceNarrative" TEXT;

ALTER TABLE "BusinessCase" DROP CONSTRAINT IF EXISTS "BusinessCase_status_check";
ALTER TABLE "BusinessCase"
  ADD CONSTRAINT "BusinessCase_status_check" CHECK (
    status IN ('draft', 'in_review', 'approved', 'rejected')
  );

ALTER TABLE "BusinessCase" DROP CONSTRAINT IF EXISTS "BusinessCase_recommendation_check";
ALTER TABLE "BusinessCase"
  ADD CONSTRAINT "BusinessCase_recommendation_check" CHECK (
    "recommendationState" IS NULL OR "recommendationState" IN (
      'proceed',
      'proceed_with_conditions',
      'validate',
      'defer',
      'do_not_proceed'
    )
  );
