import "server-only";

const allowedLoginHosts = new Set([
  "login.salesforce.com",
  "test.salesforce.com",
]);

export function isSalesforceConfigured() {
  return Boolean(
    process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_CLIENT_SECRET &&
      process.env.TOKEN_ENCRYPTION_KEY,
  );
}

export function getSalesforceOAuthConfig() {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const loginUrl = process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com";
  const callbackUrl =
    process.env.SALESFORCE_CALLBACK_URL ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/connectors/salesforce/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Salesforce Connected App environment is not configured.");
  }

  const host = new URL(loginUrl).host;
  if (!allowedLoginHosts.has(host)) {
    throw new Error("SALESFORCE_LOGIN_URL must be login or test.salesforce.com");
  }

  return { clientId, clientSecret, loginUrl, callbackUrl };
}
