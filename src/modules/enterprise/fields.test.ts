import { describe, expect, it } from "vitest";
import { visibleFields } from "@/modules/enterprise/fields";

describe("visible fields", () => {
  it("matches the object manager list and drops describe audit stamps", () => {
    const fields = visibleFields([
      field("Id", false),
      field("IsDeleted", false),
      field("Name", false),
      field("OwnerId", false),
      field("CreatedDate", false),
      field("CreatedById", false),
      field("LastModifiedDate", false),
      field("LastModifiedById", false),
      field("SystemModstamp", false),
      field("Forecast_Owner__c", true),
    ]);

    expect(fields.map((item) => item.apiName)).toEqual([
      "Name",
      "OwnerId",
      "CreatedById",
      "LastModifiedById",
      "Forecast_Owner__c",
    ]);
  });
});

function field(apiName: string, custom: boolean) {
  return {
    apiName,
    label: apiName,
    type: "string",
    required: false,
    custom,
  };
}
