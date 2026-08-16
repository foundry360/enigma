import "server-only";

import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findUserById } from "@/server/services/users";

export type SessionPayload = {
  userId: string;
  tenantId: string;
  role: UserRole;
};

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return null;
  }

  const profile = await findUserById(userId);

  if (!profile) {
    return null;
  }

  return {
    userId: profile.id,
    tenantId: profile.tenantId,
    role: profile.role,
  } satisfies SessionPayload;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
