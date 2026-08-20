import type { EnterpriseField } from "@/modules/enterprise/types";

const platformSystemField =
  /^(Id|IsDeleted|CreatedDate|LastModifiedDate|SystemModstamp|LastActivityDate|LastViewedDate|LastReferencedDate|MasterRecordId|CurrencyIsoCode)$/i;

export function isPlatformSystemField(apiName: string) {
  return platformSystemField.test(apiName);
}

export function visibleFields(fields: EnterpriseField[]) {
  return fields.filter((field) => !isPlatformSystemField(field.apiName));
}
