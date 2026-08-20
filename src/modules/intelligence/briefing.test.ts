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
    {
      key: "access_surface",
      title: "Access control",
      score: 40,
      reason: "The permission set is large.\n\nA broad identity over-consumes writes.",
      risk: "A broad profile would let the agent change too much.",
      recommendation: "Use a dedicated agent permission set.",
      evidence: [
        { citation: "44 profiles and 179 permission sets." },
      ],
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

  it("explains why access is weak from the count, not a profile roster", () => {
    const named = buildIntelligenceBriefing({
      environment: "Acme Service",
      status: "COMPLETE",
      factCount: 12,
      signals: [
        {
          key: "access_surface",
          title: "Access control",
          score: 40,
          reason:
            "An access estate exists to constrain what an agent identity can invoke and change.\n\nA broad identity will over-consume write actions and make the forecast noisy.",
          risk: "A large permission estate makes least-privilege agent access harder.",
          recommendation:
            "Use a dedicated agent permission set; do not reuse a broad human profile.",
          evidence: [
            {
              citation:
                "44 profiles: Analytics Cloud Integration User, Chatter Free User, Standard User, System Administrator.",
            },
            { citation: "179 permission sets: Case Agent." },
          ],
        },
      ],
      candidates: [],
    });

    const answer = answerFromBriefing("Why is Access control weak?", named);

    expect(answer).toMatch(/Access control is weak because/i);
    expect(answer).toMatch(/44 profiles/i);
    expect(answer).toMatch(/179 permission sets/i);
    expect(answer).toMatch(/dedicated agent permission set/i);
    expect(answer).not.toMatch(/Analytics Cloud Integration User/);
    expect(answer).not.toMatch(/estate/i);
    expect(answer).not.toMatch(/I can only explain this intelligence run/i);
  });

  it("explains a single candidate without inventing prices", () => {
    const answer = answerFromBriefing(
      "Why am I only seeing one opportunity?",
      briefing,
    );

    expect(answer).toMatch(/only seeing Service agent/i);
    expect(answer).toMatch(/durable work/i);
    expect(answer).not.toMatch(/Guided workflow/i);
    expect(answer).toContain("\n\n");
    expect(answer).not.toMatch(/Evidence:/);
    expect(answer).not.toMatch(/Addressable work \(strong\)/);
    expect(answer.toLowerCase()).not.toContain("list price");
  });

  it("does not invent profile names when the run only stored a count", () => {
    const answer = answerFromBriefing(
      "Can you name the 44 profiles in the org?",
      briefing,
    );

    expect(answer).toMatch(/44 profiles/i);
    expect(answer).toMatch(/did not store/i);
    expect(answer).toMatch(/will not invent/i);
    expect(answer).not.toMatch(/I can walk the saved Business Case/i);
    expect(answer).not.toMatch(/I can only explain this intelligence run/i);
  });

  it("names profiles when the run stored them", () => {
    const named = buildIntelligenceBriefing({
      environment: "Acme Service",
      status: "COMPLETE",
      factCount: 12,
      signals: [
        {
          key: "access_surface",
          title: "Access control",
          score: 40,
          reason: "Access can be constrained.\n\nKeep the identity dedicated.",
          risk: "A broad profile is the failure mode.",
          recommendation: "Use a dedicated agent permission set.",
          evidence: [
            { citation: "3 profiles: Admin, Standard User, Minimum Access." },
            { citation: "2 permission sets: Case Agent, Knowledge Reader." },
          ],
        },
      ],
      candidates: [],
    });

    const answer = answerFromBriefing("Can you name the profiles in the org?", named);
    expect(answer).toMatch(/Admin/);
    expect(answer).toMatch(/Standard User/);
    expect(answer).toMatch(/Minimum Access/);
    expect(answer).toMatch(/Case Agent/);
  });

  it("names work objects from stored evidence instead of refusing the question", () => {
    const named = buildIntelligenceBriefing({
      environment: "Acme Service",
      status: "COMPLETE",
      factCount: 12,
      signals: [
        {
          title: "Addressable work",
          score: 80,
          reason:
            "Case work is present and queryable.\n\nConversations can be counted against a known path.",
          risk: "Volume can still be uneven.",
          recommendation: "Start with a narrow Case topic.",
          evidence: [
            {
              citation:
                "Work objects: Case, Account, Contact, Lead, Opportunity.",
            },
          ],
        },
      ],
      candidates: [],
    });

    const answer = answerFromBriefing(
      "Can you name the work objects in the org?",
      named,
    );

    expect(answer).toMatch(/Case/);
    expect(answer).toMatch(/Account/);
    expect(answer).toMatch(/Opportunity/);
    expect(answer).not.toMatch(/I can only explain this intelligence run/i);
  });

  it("describes an opportunity in paragraphs instead of fragments", () => {
    const answer = answerFromBriefing("Why is Service agent a candidate?", briefing);

    expect(answer).toMatch(/high-confidence|medium-confidence/i);
    expect(answer).toContain("\n\n");
    expect(answer).toMatch(/Addressable work is strong/i);
    expect(answer).not.toMatch(/Evidence:/);
    expect(answer).not.toMatch(/It is supported by/);
    expect(answer).not.toMatch(/It needs /);
  });

  it("refuses official prices and ROI", () => {
    const answer = answerFromBriefing("What is the ROI and license price?", briefing);

    expect(answer).toMatch(/official Salesforce prices/i);
    expect(answer).toMatch(/Business Case/i);
  });

  it("suggests asks from the strongest signal and first candidate", () => {
    expect(suggestedAsks(briefing)).toEqual([
      "Why is Addressable work strong?",
      "Why am I only seeing one opportunity?",
      "Why is Service agent a candidate, and what evidence supports it?",
    ]);
  });

  it("keeps the model prompt free of invented prices", () => {
    expect(briefingToPrompt(briefing)).toContain("Addressable work is strong");
    expect(briefingToPrompt(briefing)).not.toMatch(/\$\d/);
  });
});
