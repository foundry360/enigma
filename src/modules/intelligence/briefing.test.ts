import { describe, expect, it } from "vitest";
import {
  answerFromBriefing,
  briefingToPrompt,
  buildIntelligenceBriefing,
  suggestedAsks,
} from "@/modules/intelligence/briefing";

const briefing = buildIntelligenceBriefing({
  environment: "Acme Service",
  status: "COMPLETE",
  factCount: 12,
  signals: [
    {
      title: "Addressable work",
      score: 80,
      reason:
        "Case work is present and queryable.\n\nConversations can be counted against a known path instead of an unbounded chat.",
      risk: "Volume can still be uneven.",
      recommendation: "Start with a narrow Case topic.",
      evidence: [{ citation: "objects: Case present" }],
    },
    {
      title: "Write-back control",
      score: 30,
      reason: "Write paths are not constrained.\n\nWrites may create unbounded consumption.",
      risk: "An agent could write more than intended.",
      recommendation: "Limit write-back to a known Case path.",
      evidence: [{ citation: "security: write surface open" }],
    },
  ],
  candidates: [
    {
      name: "Service agent",
      description: "A Case-handling agent",
      finding: "Work, path, and grounding support a service agent.",
      confidence: "medium",
      status: "candidate",
      supportingSignals: [
        { title: "Addressable work", strength: "strong" },
        { title: "Operating path", strength: "mixed" },
      ],
      consumptionDrivers: ["Case conversations"],
      valueDrivers: ["Faster first response"],
      constraints: ["Write-back is weak."],
    },
  ],
});

describe("intelligence briefing", () => {
  it("answers a named signal from evidence, not invented scores", () => {
    const answer = answerFromBriefing("Why is Addressable work strong?", briefing);

    expect(answer).toContain("Addressable work is strong");
    expect(answer).toContain("objects: Case present");
    expect(answer).toContain("Start with a narrow Case topic.");
    expect(answer).not.toMatch(/\$\d/);
  });

  it("explains a single candidate without inventing prices", () => {
    const answer = answerFromBriefing("Why is there only one candidate?", briefing);

    expect(answer).toContain("Service agent is the only candidate");
    expect(answer).toContain("Write-back control (weak)");
    expect(answer.toLowerCase()).not.toContain("list price");
  });

  it("refuses official prices and ROI", () => {
    const answer = answerFromBriefing("What is the ROI and license price?", briefing);

    expect(answer).toMatch(/does not contain official prices/i);
    expect(answer).toMatch(/Business Case/i);
  });

  it("suggests asks from the strongest signal and first candidate", () => {
    expect(suggestedAsks(briefing)).toEqual([
      "Why is Addressable work strong?",
      "Why is there only one candidate?",
      "What should I watch before promoting Service agent?",
    ]);
  });

  it("keeps the model prompt free of invented prices", () => {
    expect(briefingToPrompt(briefing)).toContain("Addressable work is strong");
    expect(briefingToPrompt(briefing)).not.toMatch(/\$\d/);
  });
});
