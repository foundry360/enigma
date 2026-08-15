export const SALESFORCE_ADAPTER_STATUS = "not_implemented" as const;

export function assertSalesforceAdapterReady(): never {
  throw new Error(
    "Salesforce adapter is scheduled for Sprint 2. Import normalized types from @/modules/enterprise instead.",
  );
}
