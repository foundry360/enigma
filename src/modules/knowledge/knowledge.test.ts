import { describe, expect, it } from "vitest";
import { knowledgeCatalog } from "@/modules/knowledge/catalog";
import { composeKnowledge, retrieveKnowledge } from "@/modules/knowledge/retrieve";

describe("knowledge base", () => {
  it("never hard-codes official prices", () => {
    const copy = knowledgeCatalog.map((entry) => entry.content).join(" ");
    expect(copy).not.toMatch(/\$\d/);
    expect(copy.toLowerCase()).not.toContain("list price");
  });

  it("always loads identity, decipher, and price guardrails for Ask", () => {
    const ids = retrieveKnowledge({ surface: "ask" }).map((entry) => entry.id);
    expect(ids).toContain("identity.ask");
    expect(ids).toContain("instruction.decipher");
    expect(ids).toContain("guardrail.prices");
    expect(ids).not.toContain("prompt.case-narrative");
  });

  it("does not pull calculation packs for a value-driver conversation", () => {
    const ids = retrieveKnowledge({
      surface: "ask",
      question: "What do value drivers mean, and why are they important?",
    }).map((entry) => entry.id);

    expect(ids).not.toContain("formula.economics");
    expect(ids).not.toContain("instruction.calculations");
  });

  it("retrieves formulas when the user asks how consumption is calculated", () => {
    const ids = retrieveKnowledge({
      surface: "ask",
      question: "How is Consumption calculated?",
    }).map((entry) => entry.id);

    expect(ids).toContain("formula.economics");
    expect(ids).toContain("instruction.calculations");
    expect(ids).toContain("glossary.terms");
  });

  it("retrieves evidence rules when expanding signal citations", () => {
    const ids = retrieveKnowledge({
      surface: "case-narrative",
      question: "Expand the evidence citations for these signals.",
    }).map((entry) => entry.id);

    expect(ids).toContain("instruction.evidence");
  });

  it("retrieves recommendation rules when the user asks why to proceed", () => {
    const ids = retrieveKnowledge({
      surface: "ask",
      question: "Why this recommendation, and what would change it?",
    }).map((entry) => entry.id);

    expect(ids).toContain("instruction.recommendation");
  });

  it("composes a grounded Ask prompt without Salesforce licenses", () => {
    const prompt = composeKnowledge({
      surface: "ask",
      question: "What evidence supports this opportunity?",
    });

    expect(prompt).toContain("Ask Enigma");
    expect(prompt).toContain("Decipher");
    expect(prompt).toContain("short paragraphs");
    expect(prompt.toLowerCase()).not.toContain("license price");
  });
});
