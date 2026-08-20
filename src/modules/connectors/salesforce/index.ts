export { isSalesforceConfigured } from "@/modules/connectors/salesforce/env";
export {
  buildAuthorizeUrl,
  createOAuthState,
  exchangeAuthorizationCode,
  fetchSalesforceIdentity,
  instanceKind,
  openOAuthState,
  revokeRefreshToken,
  sealOAuthState,
} from "@/modules/connectors/salesforce/oauth";
export {
  describeSalesforceObject,
  getSalesforceAgentforceConfiguration,
  getSalesforceIntegrationMap,
  getSalesforceKnowledgePosture,
  getSalesforceOrgLimits,
  getSalesforceSecuritySummary,
  listSalesforceAutomations,
  listSalesforceObjects,
  listSalesforceProcessControls,
  listSalesforceValidationRules,
  mapSalesforceOrgProfile,
  withSalesforceAccess,
} from "@/modules/connectors/salesforce/adapter";
