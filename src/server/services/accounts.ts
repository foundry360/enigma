import { prisma } from "@/lib/db/prisma";
import { scopedCreate, tenantWhere } from "@/lib/tenants/scope";
import { writeAuditLog } from "@/server/services/audit";

export async function listAccounts(tenantId: string) {
  return prisma.organization.findMany({
    where: tenantWhere(tenantId),
    include: {
      connections: {
        select: { id: true, platformType: true, status: true },
      },
      assessments: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createAccount(input: {
  tenantId: string;
  userId: string;
  name: string;
  industry?: string;
}) {
  const organization = await prisma.organization.create({
    data: scopedCreate(input.tenantId, {
      name: input.name,
      industry: input.industry || null,
    }),
  });

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "organization.create",
    entity: "Organization",
    entityId: organization.id,
    metadata: { name: organization.name },
  });

  return organization;
}

export async function getWorkspaceSummary(tenantId: string) {
  const [accountCount, assessmentCount, connectionCount] = await Promise.all([
    prisma.organization.count({ where: tenantWhere(tenantId) }),
    prisma.assessment.count({ where: tenantWhere(tenantId) }),
    prisma.platformConnection.count({ where: tenantWhere(tenantId) }),
  ]);

  return { accountCount, assessmentCount, connectionCount };
}
