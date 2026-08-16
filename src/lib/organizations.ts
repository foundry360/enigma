export const organizationTypes = [
  "Enterprise",
  "Mid-market",
  "SMB",
  "Public sector",
] as const;

export const employeeRanges = [
  "1–50",
  "51–200",
  "201–1,000",
  "1,001–5,000",
  "5,000+",
] as const;

export const customerStatuses = ["Prospect", "Active", "Inactive"] as const;

export type OrganizationType = (typeof organizationTypes)[number];
export type EmployeeRange = (typeof employeeRanges)[number];
export type CustomerStatus = (typeof customerStatuses)[number];
