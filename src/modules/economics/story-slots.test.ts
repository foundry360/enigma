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
  });

  it("turns single line breaks into paragraphs and keeps story tokens", () => {
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
    expect(accepted.justificationNarrative).toContain("\n\n");
    expect(accepted.justificationNarrative).toContain("They do {{volume}} a year.");
    expect(accepted.justificationNarrative).toContain("People cost is {{value}}.");
    expect(accepted.recommendationNarrative).toContain("The recommendation is {{state}}.");
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

  it("names every promoted opportunity in fallback stories", () => {
    const names = ["Credentialing agent", "Case agent", "License agent"];
    const justification = fallbackJustificationStory({
      complete: true,
      process: "Service work handling",
      area: "Service",
      capability: "Service agent",
      opportunityNames: names,
      valueDrivers: [],
      consumptionDrivers: [],
      constraints: [],
    });
    const recommendation = fallbackRecommendationStory(true, names);

    expect(justification).toContain("Credentialing agent");
    expect(justification).toContain("Case agent");
    expect(justification).toContain("License agent");
    expect(justification).toContain("\n\n");
    expect(recommendation).toContain("Credentialing agent, Case agent, and License agent");
    expect(recommendation).toContain("\n\n");
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
        "Credentialing agent, Case agent, and License agent share {{volume}}.",
        names,
      ),
    ).toBe(true);
  });
});
