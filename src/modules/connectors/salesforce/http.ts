import "server-only";

import {
  assertAllowedSalesforcePath,
  salesforcePath,
} from "@/modules/connectors/salesforce/paths";

export {
  assertAllowedSalesforcePath,
  assertSafeObjectApiName,
  restQueries,
  salesforcePath,
  toolingQueries,
} from "@/modules/connectors/salesforce/paths";

export async function salesforceRequest<T>(input: {
  instanceUrl: string;
  accessToken?: string;
  path: string;
  method?: "GET" | "POST";
  body?: URLSearchParams;
}): Promise<T> {
  const url = new URL(input.path, input.instanceUrl);
  assertAllowedSalesforcePath(`${url.pathname}${url.search}`);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`;
  }

  if (input.body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers,
    body: input.body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Salesforce request failed (${await salesforceErrorDetail(response)}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function salesforceErrorDetail(response: Response) {
  try {
    const payload = (await response.json()) as
      | { error?: string; error_description?: string }
      | { message?: string; errorCode?: string }[];

    if (Array.isArray(payload) && payload[0]?.message) {
      return payload[0].errorCode
        ? `${payload[0].errorCode}: ${payload[0].message}`
        : payload[0].message;
    }

    if (!Array.isArray(payload)) {
      return payload.error_description ?? payload.error ?? String(response.status);
    }
  } catch {
    // Body is not JSON; keep the status code.
  }

  return String(response.status);
}
