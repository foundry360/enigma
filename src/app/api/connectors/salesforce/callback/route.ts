import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  exchangeAuthorizationCode,
  fetchSalesforceIdentity,
  mapSalesforceOrgProfile,
  openOAuthState,
} from "@/modules/connectors/salesforce";
import { getAccount } from "@/server/services/accounts";
import { createConnectedSalesforce } from "@/server/services/connections";
import { setProjectEnvironment } from "@/server/services/projects";

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nonce = searchParams.get("state");
  const cookie = (await cookies()).get("enigma_sf_oauth")?.value;

  const fail = (path = "/accounts") => {
    const response = NextResponse.redirect(
      new URL(`${path}?salesforce=error`, origin),
    );
    response.cookies.delete("enigma_sf_oauth");
    return response;
  };

  if (!code || !nonce || !cookie) {
    return fail();
  }

  let state;
  try {
    state = openOAuthState(cookie);
  } catch {
    return fail();
  }

  if (state.nonce !== nonce) {
    return fail(state.returnTo);
  }

  const organization = await getAccount(session.tenantId, state.organizationId);

  if (!organization) {
    return fail();
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: state.codeVerifier,
    });

    if (!tokens.refresh_token) {
      return fail(state.returnTo);
    }

    const identity = await fetchSalesforceIdentity({
      instanceUrl: tokens.instance_url,
      accessToken: tokens.access_token,
    });

    const connection = await createConnectedSalesforce({
      tenantId: session.tenantId,
      userId: session.userId,
      organizationId: organization.id,
      refreshToken: tokens.refresh_token,
      instanceUrl: tokens.instance_url,
      externalOrgId: identity.organization_id ?? null,
      externalOrgName: identity.organization_name ?? null,
      orgProfile: mapSalesforceOrgProfile(identity, tokens.instance_url),
    });

    if (state.projectId && connection) {
      await setProjectEnvironment({
        tenantId: session.tenantId,
        userId: session.userId,
        projectId: state.projectId,
        connectionId: connection.id,
        attached: true,
      });
    }

    const response = NextResponse.redirect(
      new URL(`${state.returnTo}?salesforce=connected`, origin),
    );
    response.cookies.delete("enigma_sf_oauth");
    return response;
  } catch {
    return fail(state.returnTo);
  }
}
