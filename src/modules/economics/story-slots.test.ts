import { describe, expect, it } from "vitest";
import {
  acceptCaseStories,
  caseStoryScope,
  fallbackJustificationStory,
  fallbackRecommendationStory,
  fillStorySlots,
  formatStoryText,
  hasStorySlots,
  shouldRefreshCaseStories,
  storiesCoverOpportunities,
  storyValues,
  stripEmDashes,
  withStoryScope,
} from "@/modules/economics/story-slots";

describe("story slots", () => {
  it("fills live numbers and strips em dashes", () => {
    const values = storyValues({
      volume: 25000,
      share: 0.2,
      impacted: 5000,
      hours: 2,
      labor: 110,
      value: 1_100_000,
      workItemCost: 1.25,
      consumption: 6250,
      net: 1_093_750,
      roc: 176,
      state: "proceed_with_conditions",
    });

    expect(
      fillStorySlots(
        "At {{share}} they take {{impacted}} of {{volume}}. Value is {{value}}, consumption is {{consumption}}.",
        values,
      ),
    ).toBe(
      "At 20% they take 5,000 of 25,000. Value is $1,100,000, consumption is $6,250.",
    );
    expect(values.state).toBe("Proceed with Conditions");
    expect(stripEmDashes("People cost — then run cost")).toBe(
      "People cost, then run cost",
    );
  });

  it("replaces a leftover Service agent name and joins one-sentence fragments", () => {
    const filled = fillStorySlots(
      "Service agent is a high-confidence opportunity.\n\nAddressable work is strong.\n\nWrite-back control is weak.\n\n{{roc}} is the return.",
      { roc: "12.0x" },
      ["Order agent", "Refund agent"],
    );

    expect(filled).not.toMatch(/service agent/i);
    expect(filled).toContain("Order agent");
    expect(filled).toContain("12.0x");
    expect(filled.split(/\n\s*\n/).length).toBeLessThan(4);
  });

  it("formats stories into capitalized sentences and paragraphs", () => {
    const formatted = formatStoryText(
      "about {{volume}} happens a year. at {{share}}, an agent would take {{impacted}}. keeping people on that work costs {{value}}. taking the same work costs {{consumption}}. after paying to run it, {{net}} stays on the table. roc is {{roc}}.",
    );

    expect(formatted).toContain("\n\n");
    expect(formatted.startsWith("About {{volume}}")).toBe(true);
    expect(formatted).toContain("At {{share}}, an agent would take {{impacted}}.");
    expect(formatted).toContain("ROC is {{roc}}.");
    expect(formatted.split(/\n\n/).every((paragraph) => /[.!?]$/.test(paragraph))).toBe(
      true,
    );
    expect(
      formatStoryText(
        "Credentialing agent sits on provider credentialing. ⟦Work objects: Credentialing__c⟧",
      ),
    ).toBe("Credentialing agent sits on provider credentialing.");
  });

  it("keeps single line breaks as one narrative paragraph", () => {
    const accepted = acceptCaseStories(
      JSON.stringify({
        justification:
          "they do {{volume}} a year.\npeople cost is {{value}}.\nrun cost is {{consumption}}.",
        recommendation: "the recommendation is {{state}}.\nstay with that label.",
      }),
      {
        justification: "Fallback {{volume}}.",
        recommendation: "Fallback {{state}}.",
      },
    );

    expect(accepted.fromModel).toBe(true);
    expect(accepted.justificationNarrative).toContain(
      "They do {{volume}} a year. People cost is {{value}}. Run cost is {{consumption}}.",
    );
    expect(accepted.justificationNarrative.split(/\n\s*\n/).length).toBe(1);
    expect(accepted.recommendationNarrative).toContain(
      "The recommendation is {{state}}. Stay with that label.",
    );
  });

  it("accepts a model story only when slots are present", () => {
    const fallback = {
      justification: fallbackJustificationStory({
        complete: true,
        process: "Service work handling",
        area: "Service",
        capability: "Service agent",
        valueDrivers: [],
        consumptionDrivers: [],
        constraints: [],
      }),
      recommendation: "The recommendation is {{state}}.",
    };

    const accepted = acceptCaseStories(
      JSON.stringify({
        justification:
          "They do {{volume}} a year. People cost is {{value}}. Run cost is {{consumption}}.",
        recommendation: "Stay at {{state}} while ROC is {{roc}}.",
      }),
      fallback,
    );

    expect(accepted.fromModel).toBe(true);
    expect(hasStorySlots(accepted.justificationNarrative)).toBe(true);

    const rejected = acceptCaseStories(
      JSON.stringify({
        justification: "This service project should deploy now.",
        recommendation: "Proceed with Conditions.",
      }),
      fallback,
    );
    expect(rejected.fromModel).toBe(false);
    expect(rejected.justificationNarrative).toBe(fallback.justification);
  });

  it("writes a finding and signal picture for every promoted opportunity", () => {
    const names = ["Credentialing agent", "Case agent", "License agent"];
    const opportunities = [
      {
        name: "Credentialing agent",
        process: "Provider credentialing",
        capability: "Credentialing agent",
        confidence: "high",
        finding: "Work, path, and grounding are present.",
        signals: [
          { key: "addressable_work", title: "Addressable work", strength: "strong" },
          { key: "grounded_answers", title: "Grounded answers", strength: "weak" },
        ],
        evidence: ["Work objects: Credentialing__c."],
      },
      {
        name: "Case agent",
        process: "Service work handling",
        capability: "Case agent",
        confidence: "medium",
        finding: "Case is in use, with mixed write-back control.",
        signals: [
          { key: "addressable_work", title: "Addressable work", strength: "strong" },
          { key: "writeback_control", title: "Write-back control", strength: "weak" },
        ],
        evidence: [{ citation: "Case has 0 required fields." }],
      },
      {
        name: "License agent",
        process: "License renewals",
        capability: "License agent",
        confidence: "medium",
        finding: "License renewals are queryable and layoutable.",
        signals: [
          { key: "operating_path", title: "Operating path", strength: "mixed" },
        ],
        evidence: ["Work objects: License__c."],
      },
    ];
    const justification = fallbackJustificationStory({
      complete: true,
      process: "Service work handling",
      area: "Service",
      capability: "Service agent",
      opportunityNames: names,
      opportunities,
      valueDrivers: ["Handle time", "Cycle time"],
      consumptionDrivers: ["Customer interactions"],
      constraints: [
        "Existing automation may collide with agent writes",
        "Grounded answers are thin",
      ],
    });
    const recommendation = fallbackRecommendationStory({
      complete: true,
      opportunityNames: names,
      opportunities,
      constraints: [
        "Existing automation may collide with agent writes",
        "Write-back controls must stay narrow",
      ],
      recommendationState: "proceed_with_conditions",
    });

    expect(justification).toContain("work across these opportunities");
    expect(justification).not.toContain("this service work handling");
    expect(justification).not.toContain("is a credentialing agent on provider credentialing");
    expect(justification).toContain(
      "Credentialing agent sits on provider credentialing as a high-confidence opportunity",
    );
    expect(justification).toContain("Work and path are in view");
    expect(justification).not.toContain("Credentialing work is durable and already on a path");
    expect(justification).toContain("Addressable work is strong");
    expect(justification).toContain("Durable work records");
    expect(justification).toContain("still weak");
    expect(justification).not.toContain("grounding are present");
    expect(justification).not.toContain("⟦");
    expect(justification).toContain("Case agent sits on service work handling");
    expect(justification).toContain("License renewals are queryable and layoutable");
    expect(justification).toContain("Operating path is mixed");
    expect(justification).toContain("handle time and cycle time");
    expect(
      justification.match(/path is supported but not unconstrained/gi)?.length ?? 0,
    ).toBeLessThanOrEqual(1);
    expect(justification).toContain("\n\n");
    expect(recommendation).toContain("The numbers support moving forward");
    expect(recommendation).toContain("ROC is {{roc}}");
    expect(recommendation).toContain("annual net is {{net}}");
    expect(recommendation).not.toContain("People cost is {{value}}");
    expect(recommendation).toContain("Credentialing agent covers provider credentialing");
    expect(recommendation).toContain("Case agent covers service work handling");
    expect(recommendation).toContain("License agent covers license renewals");
    expect(recommendation).toContain("Write-back control is still weak");
    expect(recommendation).toContain("Grounded answers is still weak");
    expect(recommendation).toContain("lock the rest");
    expect(recommendation).toContain("Name one start, one handoff");
    expect(recommendation).not.toContain("The recommendation is {{state}}");
    expect(recommendation).not.toContain("Use each of them as named");
    expect(recommendation).not.toContain("⟦");
    expect(recommendation).toContain("\n\n");
    expect(
      fallbackJustificationStory({
        complete: true,
        process: "Service work handling",
        area: "Service",
        capability: "Service agent",
        opportunityNames: names,
        opportunities,
        valueDrivers: ["Handle time", "Cycle time"],
        consumptionDrivers: ["Customer interactions"],
        constraints: [
          "Existing automation may collide with agent writes",
          "Grounded answers are thin",
        ],
      }),
    ).toBe(justification);
  });

  it("does not name Service agent when that opportunity is not on the case", () => {
    const justification = fallbackJustificationStory({
      complete: true,
      process: "Service work handling",
      area: "Service",
      capability: "Service agent",
      opportunityNames: ["Order agent", "Refund agent"],
      opportunities: [
        {
          name: "Order agent",
          process: "Order handling",
          finding: "Work, path, and grounding support a service agent.",
          signals: [
            { key: "grounded_answers", title: "Grounded answers", strength: "weak" },
          ],
        },
        {
          name: "Refund agent",
          process: "Refund handling",
          finding: "Work, path, and grounding are present.",
          signals: [
            { key: "addressable_work", title: "Addressable work", strength: "strong" },
          ],
        },
      ],
    });

    expect(justification).toContain("Order agent");
    expect(justification).toContain("Refund agent");
    expect(justification).not.toMatch(/service agent/i);
  });

  it("skips missing names and drivers in fallback stories", () => {
    const justification = fallbackJustificationStory({
      complete: true,
      process: "Service work handling",
      area: "Service",
      capability: "Service agent",
      opportunityNames: ["Service agent", undefined as never, ""],
      opportunities: [
        { name: "Service agent", process: "Service work handling" },
        { name: undefined as never, process: null },
      ],
      valueDrivers: ["Handle time", undefined as never],
      consumptionDrivers: undefined as never,
      constraints: [null as never, "Existing automation may collide"],
    });

    expect(justification).toContain("Service agent");
    expect(justification).toContain("handle time");
    expect(justification).toContain("existing automation may collide");
  });

  it("refreshes stories when the promoted set is not on the stored scope", () => {
    const slotted = "At {{share}} the recommendation is {{state}}.";
    expect(
      shouldRefreshCaseStories({
        justification: slotted,
        recommendation: slotted,
        intelligence: "Case agent is supported by Addressable work.",
        opportunityIds: ["opp-1", "opp-2"],
      }),
    ).toBe(true);
    expect(
      shouldRefreshCaseStories({
        justification: slotted,
        recommendation: slotted,
        intelligence: withStoryScope(
          "Case agent is supported by Addressable work.",
          caseStoryScope(["opp-2", "opp-1"]),
        ),
        opportunityIds: ["opp-1", "opp-2"],
      }),
    ).toBe(false);
    expect(
      shouldRefreshCaseStories({
        justification: slotted,
        recommendation: slotted,
        intelligence: withStoryScope(
          "Case agent is supported by Addressable work.",
          caseStoryScope(["opp-1"], "run-1"),
        ),
        opportunityIds: ["opp-1"],
        assessmentId: "run-2",
      }),
    ).toBe(true);
    expect(
      shouldRefreshCaseStories({
        justification: slotted,
        recommendation: slotted,
        intelligence: withStoryScope(
          "Case agent is supported by Addressable work.",
          caseStoryScope(["opp-1"], "run-2"),
        ),
        opportunityIds: ["opp-1"],
        assessmentId: "run-2",
      }),
    ).toBe(false);
  });

  it("rejects copy that names only one of several promoted opportunities", () => {
    const names = ["Credentialing agent", "Case agent", "License agent"];
    expect(
      storiesCoverOpportunities(
        "Case agent can take this work at {{share}}.",
        names,
      ),
    ).toBe(false);
    expect(
      storiesCoverOpportunities(
        "Order agent, Account agent, and Refund agent share {{volume}}. Service agent is also in view.",
        ["Order agent", "Account agent", "Refund agent"],
      ),
    ).toBe(false);
    expect(
      storiesCoverOpportunities(
        "Credentialing agent, Case agent, and License agent share {{volume}}. The path is supported but not unconstrained. The path is supported but not unconstrained.",
        names,
      ),
    ).toBe(true);
  });
});
