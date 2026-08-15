export class TenantAccessError extends Error {
  constructor(message = "Tenant isolation violation") {
    super(message);
    this.name = "TenantAccessError";
  }
}
