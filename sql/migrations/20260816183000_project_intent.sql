ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_platformType_check";

ALTER TABLE "Project" ALTER COLUMN "platformType" DROP NOT NULL;

ALTER TABLE "Project" ADD CONSTRAINT "Project_platformType_check" CHECK (
    "platformType" IS NULL
    OR "platformType" IN ('SALESFORCE', 'PEGA', 'SERVICENOW', 'MICROSOFT', 'OTHER')
);

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectType" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "objective" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "outcomes" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "outcomeOther" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Planning';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "businessUnit" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "executiveSponsor" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "customerLead" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "targetDate" DATE;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "successMetrics" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "connectPlatformLater" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Project"
SET
    "projectType" = COALESCE("projectType", 'Custom'),
    "objective" = COALESCE("objective", 'Not specified'),
    "status" = COALESCE("status", 'Planning')
WHERE "projectType" IS NULL OR "objective" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "projectType" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "objective" SET NOT NULL;

ALTER TABLE "Project"
    ADD CONSTRAINT "Project_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectPlatformScope" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platformType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPlatformScope_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectPlatformScope_platformType_check" CHECK (
        "platformType" IN ('SALESFORCE', 'PEGA', 'SERVICENOW', 'MICROSOFT', 'OTHER')
    ),
    CONSTRAINT "ProjectPlatformScope_project_platform_key" UNIQUE ("projectId", "platformType")
);

CREATE INDEX "ProjectPlatformScope_tenantId_idx" ON "ProjectPlatformScope"("tenantId");
CREATE INDEX "ProjectPlatformScope_projectId_idx" ON "ProjectPlatformScope"("projectId");

ALTER TABLE "ProjectPlatformScope"
    ADD CONSTRAINT "ProjectPlatformScope_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectPlatformScope"
    ADD CONSTRAINT "ProjectPlatformScope_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectPlatformScope" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProjectPlatformScope" FROM anon, authenticated, PUBLIC;

CREATE TABLE "ProjectEnvironmentScope" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectEnvironmentScope_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectEnvironmentScope_project_connection_key" UNIQUE ("projectId", "connectionId")
);

CREATE INDEX "ProjectEnvironmentScope_tenantId_idx" ON "ProjectEnvironmentScope"("tenantId");
CREATE INDEX "ProjectEnvironmentScope_projectId_idx" ON "ProjectEnvironmentScope"("projectId");

ALTER TABLE "ProjectEnvironmentScope"
    ADD CONSTRAINT "ProjectEnvironmentScope_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEnvironmentScope"
    ADD CONSTRAINT "ProjectEnvironmentScope_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEnvironmentScope"
    ADD CONSTRAINT "ProjectEnvironmentScope_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEnvironmentScope" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProjectEnvironmentScope" FROM anon, authenticated, PUBLIC;

INSERT INTO "ProjectPlatformScope" (
    id, "tenantId", "projectId", "platformType", "createdAt"
)
SELECT
    gen_random_uuid()::text,
    "tenantId",
    id,
    "platformType",
    now()
FROM "Project"
WHERE "platformType" IS NOT NULL
ON CONFLICT ("projectId", "platformType") DO NOTHING;
