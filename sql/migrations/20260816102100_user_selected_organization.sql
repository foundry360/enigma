ALTER TABLE "User" ADD COLUMN "selectedOrganizationId" TEXT;

ALTER TABLE "User"
    ADD CONSTRAINT "User_selectedOrganizationId_fkey"
    FOREIGN KEY ("selectedOrganizationId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
