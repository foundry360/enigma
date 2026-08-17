"use server";

import { requireSession } from "@/lib/auth/session";
import type { SearchResults } from "@/lib/search";
import { searchWorkspace } from "@/server/services/search";

export async function searchWorkspaceAction(
  query: string,
): Promise<SearchResults> {
  const session = await requireSession();
  return searchWorkspace(session.tenantId, query);
}
