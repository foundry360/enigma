import { describe, expect, it } from "vitest";
import { toBusinessCaseBriefing } from "@/modules/economics/briefing";
import { emptyRollup } from "@/modules/economics/model";
import { buildIntelligenceBriefing } from "@/modules/intelligence/briefing";
import {
  answerProjectAsk,
  projectAskPrompt,
  suggestedProjectAsks,
} from "@/modules/intelligence/project-ask";

const intelligence = buildIntelligenceBriefing({
  environment: "Acme Service",
  status: "COMPLETE",
  factCount: 12,
  signals: [
    {
      title: "Addressable work",
      score: 80,
      reason: "Case work is present.\n\nConversations can be counted.",
      risk: "Volume can still be uneven.",
      recommendation: "Start with a narrow Case topic.",
      evidence: [{ citation: "objects: Case present" }],
    },
    {
      title: "Write-back control",
      score: 30,
      reason: "Write paths are open.\n\nWrites may create unbounded consumption.",
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
      supportingSignals: [{ title: "Addressable work", strength: "strong" }],
      evidence: [{ citation: "objects: Case present" }],
      consumptionDrivers: ["Case conversations"],
      valueDrivers: ["Faster first response"],
      constraints: ["Write-back is weak."],
      dependencies: ["A durable service work object"],
      risk: "Write-back without a narrow topic will create incomplete updates.",
      recommendation: "Pilot one service topic.",
    },
  ],
});

const businessCase = toBusinessCaseBriefing({
  opportunities: [
    {
      name: "Service agent",
      process: "Service work handling",
      capability: "Service agent",
      confidence: "high",
      finding: "Work, path, and grounding are present.",
      signals: [{ title: "Addressable work", strength: "strong" }],
      evidence: ["objects: Case present"],
      consumptionDrivers: ["Case conversations"],
      valueDrivers: ["Faster first response"],
      constraints: ["Write-back is weak."],
      dependencies: ["A durable service work object"],
      annualVolume: 1000,
      unitPrice: 2,
      hoursSavedPerUnit: 0.25,
      hourlyCost: 80,
    },
  ],
  scenario: "expected",
  adoption: 0.15,
  baselineDays: 180,
  enigmaDays: 60,
  implementation: 15000,
  rollup: {
    ...emptyRollup(),
    complete: true,
    impacted: 150,
    consumption: 300,
    value: 3000,
    implementation: 15000,
    netAnnual: 2700,
    roc: 10,
    roi: 0.18,
  },
  gaps: [],
  recommendationState: "proceed",
  confidence: "high",
});

const briefing = { intelligence, businessCase };

describe("project ask", () => {
  it("keeps a follow-up in the same conversation", () => {
    const answer = answerProjectAsk(
      "What does that mean for this project?",
      briefing,
      [
        {
          role: "user",
          content:
            "Can you help explain the constraints on this project as described in Implications node?",
        },
        {
          role: "assistant",
          content:
            "Watch existing automation may collide with agent writes, write-back controls must stay narrow, and agent identity should not reuse a broad human profile.",
        },
      ],
    );

    expect(answer).toMatch(/write-back|narrow|profile|automation/i);
    expect(answer).not.toMatch(/I can only explain this intelligence run/i);
    expect(answer).not.toMatch(/Impacted is 150/);
  });

  it("explains value drivers from the Implications node, not the Value formula", () => {
    const answer = answerProjectAsk(
      "What do value drivers mean, and why are they important?",
      briefing,
    );

    expect(answer).toMatch(/ways Service agent creates labor value/i);
    expect(answer).toMatch(/Faster first response/i);
    expect(answer).toMatch(/hours given back/i);
    expect(answer).not.toMatch(/Impacted 150/);
    expect(answer).not.toMatch(/Proceed with Conditions because/);
  });

  it("reruns consumption when work item cost is what-if'd", () => {
    const answer = answerProjectAsk(
      "What if reduce the work cost item to $.75?",
      briefing,
      [
        {
          role: "user",
          content: "Walk me through how consumption and value were calculated.",
        },
        {
          role: "assistant",
          content: "Consumption is $300. Value is $3,000.",
        },
      ],
    );

    expect(answer).toMatch(/what-if/i);
    expect(answer).toContain("$0.75");
    expect(answer).toContain("$113");
    expect(answer).toContain("$3,000");
    expect(answer).not.toMatch(/I can only explain this intelligence run/i);
    expect(answer.toLowerCase()).not.toContain("list price");
  });

  it("walks consumption and value from this project's inputs", () => {
    const answer = answerProjectAsk("How is Consumption calculated?", briefing);

    expect(answer).toContain("Impacted is 150");
    expect(answer).toContain("1000");
    expect(answer).toContain("0.15");
    expect(answer).toContain("$300");
    expect(answer).toContain("$3,000");
    expect(answer.toLowerCase()).not.toContain("list price");
  });

  it("explains why the recommendation landed", () => {
    const answer = answerProjectAsk("Why this recommendation?", briefing);

    expect(answer).toContain("Proceed");
    expect(answer).toMatch(/complete|positive|ROC/i);
    expect(answer).toContain("Deployment");
  });

  it("reasons from the weak signal that holds Proceed with Conditions", () => {
    const answer = answerProjectAsk("What is the recommendation based on the signals?", {
      intelligence,
      businessCase: toBusinessCaseBriefing({
        opportunities: [
          {
            name: "Service agent",
            process: "Service work handling",
            capability: "Service agent",
            confidence: "high",
            finding: "Work, path, and grounding are present.",
            signals: [
              { title: "Addressable work", strength: "strong" },
              { title: "Write-back control", strength: "weak" },
            ],
            evidence: ["objects: Case present"],
            consumptionDrivers: ["Case conversations"],
            valueDrivers: ["Faster first response"],
            constraints: ["Write-back is weak."],
            dependencies: ["A durable service work object"],
            annualVolume: 1000,
            unitPrice: 2,
            hoursSavedPerUnit: 0.25,
            hourlyCost: 80,
          },
        ],
        scenario: "expected",
        adoption: 0.15,
        implementation: 15000,
        rollup: {
          ...emptyRollup(),
          complete: true,
          impacted: 150,
          consumption: 300,
          value: 3000,
          implementation: 15000,
          netAnnual: 2700,
          roc: 176,
        },
        gaps: [],
        recommendationState: "proceed_with_conditions",
        hasWeakSignals: true,
        weakSignals: ["Write-back control"],
        confidence: "high",
      }),
    });

    expect(answer).toContain("Proceed with Conditions");
    expect(answer).toContain("Write-back control");
    expect(answer).toMatch(/still weak/i);
    expect(answer).not.toMatch(/missing investment, or ROC below 2/i);
    expect(answer).toMatch(/moves toward Proceed/i);
  });

  it("expands gaps and risks as blockers", () => {
    const answer = answerProjectAsk("What do the gaps and risks block?", {
      intelligence,
      businessCase: {
        ...businessCase,
        gaps: ["Investment is not provided."],
        recommendationWhy: "Proceed with Conditions because investment is missing.",
        recommendationState: "proceed_with_conditions",
      },
    });

    expect(answer).toContain("Investment is not provided.");
    expect(answer).toContain("Volume can still be uneven.");
    expect(answer).toContain("Write-back is weak.");
  });

  it("answers why only one opportunity in readable paragraphs", () => {
    const answer = answerProjectAsk(
      "Why am I only seeing one opportunity?",
      briefing,
    );

    expect(answer).toMatch(/only seeing Service agent/i);
    expect(answer).toContain("\n\n");
    expect(answer).not.toMatch(/Evidence:/);
    expect(answer).not.toMatch(/It is supported by Addressable work \(strong\)/);
    expect(answer).not.toMatch(/It needs A durable/);
  });

  it("still refuses official Salesforce prices", () => {
    const answer = answerProjectAsk(
      "What is the Salesforce license price?",
      briefing,
    );
    expect(answer).toMatch(/official Salesforce prices/i);
  });

  it("does not stuff calculation dumps into a conversational ask", () => {
    const prompt = projectAskPrompt(
      briefing,
      "What do value drivers mean, and why are they important?",
    );

    expect(prompt).toMatch(/Value comes from/i);
    expect(prompt).toMatch(/conversation/i);
    expect(prompt).not.toContain("Impacted 150 =");
    expect(prompt).not.toMatch(/Proceed because/i);
  });

  it("puts process, formulas, evidence, and case math in the model prompt", () => {
    const prompt = projectAskPrompt(briefing, "How is Consumption calculated?");

    expect(prompt).toContain("Decipher");
    expect(prompt).toMatch(/Impacted = Work Per Year/i);
    expect(prompt).toMatch(/Case present/i);
    expect(prompt).toContain("$300");
    expect(prompt).toContain("Confirm the case");
    expect(prompt.toLowerCase()).not.toContain("list price");
  });

  it("suggests navigator questions once a case exists", () => {
    expect(suggestedProjectAsks(briefing)[0]).toMatch(/recommendation/i);
    expect(suggestedProjectAsks(briefing)[1]).toMatch(/consumption and value/i);
  });
});
