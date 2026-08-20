import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDiscoveryProgress } from "@/server/services/assessments";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const progress = await getDiscoveryProgress(session.tenantId, id);
  return NextResponse.json(progress, {
    headers: { "Cache-Control": "no-store" },
  });
}
