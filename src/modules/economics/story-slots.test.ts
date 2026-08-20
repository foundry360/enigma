import { describe, expect, it } from "vitest";
import {
  acceptCaseStories,
  fallbackJustificationStory,
  fillStorySlots,
  hasStorySlots,
  storyValues,
  stripEmDashes,
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
});
