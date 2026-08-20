import { describe, expect, it } from "vitest";
import { parseNamedEvidenceList } from "@/modules/intelligence/evidence-list";

describe("parseNamedEvidenceList", () => {
  it("splits a counted profile dump into names", () => {
    const parsed = parseNamedEvidenceList(
      "44 profiles: Analytics Cloud Integration User, Chatter Free User, Standard User, System Administrator.",
    );

    expect(parsed?.label).toBe("profiles");
    expect(parsed?.count).toBe(44);
    expect(parsed?.items).toEqual([
      "Analytics Cloud Integration User",
      "Chatter Free User",
      "Standard User",
      "System Administrator",
    ]);
  });

  it("splits permission sets after a signal prefix", () => {
    const parsed = parseNamedEvidenceList(
      "Access control: 179 permission sets: Case Agent, Knowledge Reader, and Sales User.",
    );

    expect(parsed?.label).toBe("permission sets");
    expect(parsed?.count).toBe(179);
    expect(parsed?.items).toEqual([
      "Case Agent",
      "Knowledge Reader",
      "Sales User",
    ]);
  });

  it("leaves ordinary evidence sentences as text", () => {
    expect(
      parseNamedEvidenceList("Access control could not be read."),
    ).toBeNull();
    expect(
      parseNamedEvidenceList("Case has 40 fields (0 required)."),
    ).toBeNull();
  });

  it("treats short named inventories as lists", () => {
    const parsed = parseNamedEvidenceList(
      "Work objects: Case, Account, Contact, Lead, Opportunity.",
    );
    expect(parsed?.label).toBe("Work objects");
    expect(parsed?.items).toContain("Case");
    expect(parsed?.items).toHaveLength(5);
  });
});
