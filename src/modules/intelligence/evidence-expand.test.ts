import { describe, expect, it } from "vitest";
import {
  isGroundedExpansion,
  parseEvidenceExpansions,
  peelLayerPrefix,
  summarizeEvidenceLayers,
} from "@/modules/intelligence/evidence-expand";

const signals = [
  { key: "addressable_work", title: "Addressable work", strength: "strong" },
  { key: "writeback_control", title: "Write-back control", strength: "weak" },
  { key: "access_surface", title: "Access control", strength: "weak" },
];

describe("summarizeEvidenceLayers", () => {
  it("writes one paragraph per layer and does not repeat the node title", () => {
    const layers = summarizeEvidenceLayers({
      citations: [
        "Write-back control: 0 write rules (0 active).",
        "Write-back control: Case has 0 required fields.",
        "Addressable work: Work objects: Case, Account, Contact, Lead, Opportunity.",
        "Addressable work: Case has 40 fields (0 required).",
        "Automation collision: 5 automations (5 active).",
        "Automation collision: Active automations: Flow Case_Route; Apex trigger CaseTrigger on Case, after insert.",
      ],
      signals,
    });

    const writeback = layers.find((layer) => layer.label === "Write-back control");
    expect(writeback?.paragraph).toMatch(/0 write rules/i);
    expect(writeback?.paragraph).toMatch(/Case has no required fields/i);
    expect(writeback?.paragraph).toMatch(/incomplete Case/i);
    expect(writeback?.paragraph).not.toMatch(/Write-back control/i);

    const work = layers.find((layer) => layer.label === "Addressable work");
    expect(work?.paragraph).toMatch(/Case is the durable work record/i);
    expect(work?.paragraph).toMatch(/40 fields/i);
    expect(work?.paragraph).not.toMatch(/Addressable work/i);

    const automation = layers.find((layer) => layer.label === "Automation collision");
    expect(automation?.paragraph).toMatch(/Case_Route/i);
    expect(automation?.paragraph).toMatch(/CaseTrigger/i);
    expect(automation?.paragraph).not.toMatch(/Automation collision/i);
  });
});

describe("peelLayerPrefix", () => {
  it("splits the signal title off the stored citation", () => {
    expect(peelLayerPrefix("Write-back control: 0 write rules (0 active).")).toEqual({
      label: "Write-back control",
      fact: "0 write rules (0 active).",
    });
  });
});

describe("parseEvidenceExpansions", () => {
  it("keeps model text that stays grounded in the citation", () => {
    const citation = "Work objects: Case, Account, Contact, Lead, Opportunity.";
    const parsed = parseEvidenceExpansions(
      JSON.stringify({
        expansions: [
          {
            citation,
            text: "Case is the work object, with Account, Contact, Lead, and Opportunity around it.",
          },
        ],
      }),
      [citation],
    );

    expect(parsed?.[citation]).toMatch(/Case is the work object/);
    expect(
      isGroundedExpansion(citation, "The org has many records in another system."),
    ).toBe(false);
  });
});
