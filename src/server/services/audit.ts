import { prisma } from "@/lib/db/prisma";
import { scopedCreate } from "@/lib/tenants/scope";
import type { Prisma } from "@prisma/client";

export async function writeAuditLog(input: {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: scopedCreate(input.tenantId, {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata,
    }),
  });
}
