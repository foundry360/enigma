export function isExpiredSalesforceSession(error: string | undefined) {
  return /INVALID_SESSION_ID|Session expired or invalid/i.test(error ?? "");
}

export function isRevokedSalesforceGrant(error: string | undefined) {
  if (!error || isExpiredSalesforceSession(error)) {
    return false;
  }

  return /invalid_grant|expired access\/refresh token|invalid refresh token/i.test(
    error,
  );
}
