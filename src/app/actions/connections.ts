"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { revokeRefreshToken } from "@/modules/connectors/salesforce";
import { disconnectSalesforce } from "@/server/services/connections";

export async function disconnectSalesforceAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = String(formData.get("organizationId") ?? "");
  const connectionId = String(formData.get("connectionId") ?? "");

  if (!organizationId || !connectionId) {
    return;
  }

  const result = await disconnectSalesforce({
    tenantId: session.tenantId,
    userId: session.userId,
    organizationId,
    connectionId,
  });

  if (!result) {
    return;
  }

  if (result.refreshToken && result.connection.instanceUrl) {
    await revokeRefreshToken({
      instanceUrl: result.connection.instanceUrl,
      refreshToken: result.refreshToken,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath(`/accounts/${organizationId}`);
  revalidatePath(`/accounts/${organizationId}/platforms`);
}
