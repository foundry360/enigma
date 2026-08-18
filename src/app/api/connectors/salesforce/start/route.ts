import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { isTokenEncryptionConfigured } from "@/lib/crypto/secret";
import {
  buildAuthorizeUrl,
  createOAuthState,
  isSalesforceConfigured,
  sealOAuthState,
} from "@/modules/connectors/salesforce";
import { getAccount } from "@/server/services/accounts";

function safeReturnTo(value: string | null, organizationId: string) {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return `/accounts/${organizationId}/platforms`;
}

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams, origin } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const projectId = searchParams.get("projectId") ?? undefined;

  if (!organizationId) {
    return NextResponse.redirect(new URL("/accounts", origin));
  }

  const organization = await getAccount(session.tenantId, organizationId);

  if (!organization) {
    return NextResponse.redirect(new URL("/accounts", origin));
  }

  if (!isSalesforceConfigured() || !isTokenEncryptionConfigured()) {
    return NextResponse.redirect(
      new URL(
        `${safeReturnTo(searchParams.get("returnTo"), organizationId)}?salesforce=not-configured`,
        origin,
      ),
    );
  }

  const state = createOAuthState({
    organizationId,
    projectId,
    returnTo: safeReturnTo(searchParams.get("returnTo"), organizationId),
  });
  const authorizeUrl = buildAuthorizeUrl(state);
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("enigma_sf_oauth", sealOAuthState(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });

  return response;
}
