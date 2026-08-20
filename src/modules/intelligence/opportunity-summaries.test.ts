import { describe, expect, it } from "vitest";
import {
  summarizeBusinessContext,
  summarizeImplication,
  summarizeSupportingSignals,
} from "@/modules/intelligence/opportunity-summaries";

describe("opportunity summaries", () => {
  it("writes business context as a sentence, not a breadcrumb", () => {
    expect(
      summarizeBusinessContext({
        area: "Service",
        process: "Service work handling",
        capability: "Service agent",
      }),
    ).toBe(
      "This work sits in Service. The process is service work handling, and the recommended capability is service agent.",
    );
  });

  it("writes supporting signals as one paragraph", () => {
    const copy = summarizeSupportingSignals([
      { title: "Addressable work", strength: "strong" },
      { title: "Write-back control", strength: "weak" },
    ]);

    expect(copy).toMatch(/Addressable work is strong/i);
    expect(copy).toMatch(/Write-back control is still weak/i);
    expect(copy).not.toMatch(/→/);
  });

  it("uses score when a stored strength disagrees with the overview", () => {
    const copy = summarizeSupportingSignals([
      { title: "Addressable work", strength: "strong", score: 80 },
      { title: "Operating path", strength: "strong", score: 50 },
      { title: "Grounded answers", strength: "strong", score: 80 },
    ]);

    expect(copy).toMatch(/Addressable work and Grounded answers are strong/i);
    expect(copy).toMatch(/Operating path is mixed/i);
    expect(copy).not.toMatch(/Operating path is strong/i);
  });

  it("writes implication lists as one paragraph", () => {
    expect(
      summarizeImplication("Consumption drivers", [
        "Customer conversations the agent would answer",
        "Knowledge retrieval used to ground each answer",
      ]),
    ).toBe(
      "Consumption would show up as customer conversations the agent would answer and knowledge retrieval used to ground each answer.",
    );
  });
});
