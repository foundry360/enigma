import { describe, expect, it } from "vitest";
import { formatAskAnswer, looksLikeAskDump } from "@/modules/intelligence/ask-format";

describe("ask answer format", () => {
  it("adds punctuation and capitalizes sentences", () => {
    expect(formatAskAnswer("consumption is 300 value is 3000")).toBe(
      "Consumption is 300 value is 3000.",
    );
    expect(formatAskAnswer("proceed because the case is complete. next, save it")).toBe(
      "Proceed because the case is complete. Next, save it.",
    );
  });

  it("keeps decimal numbers intact", () => {
    const answer = formatAskAnswer(
      "Share is 0.15. Hours are 0.25. ROI is 0.18. Consumption is 300.",
    );
    expect(answer).toContain("0.15");
    expect(answer).toContain("0.25");
    expect(answer).toContain("0.18");
  });

  it("keeps supplied paragraphs and does not fragment sentences", () => {
    const answer = formatAskAnswer(
      "Impacted is 150. Consumption is $300.\n\nValue is $3,000. The case can proceed.",
    );
    expect(answer).toContain("Impacted is 150. Consumption is $300.");
    expect(answer).toContain("\n\n");
    expect(answer).toContain("Value is $3,000. The case can proceed.");
  });

  it("detects labeled evidence dumps", () => {
    expect(
      looksLikeAskDump(
        "It is supported by Addressable work (strong), Write-back control (weak). Evidence: Addressable work: Work objects: Case.",
      ),
    ).toBe(true);
    expect(
      looksLikeAskDump(
        "You are only seeing Service agent because write-back control is still weak.",
      ),
    ).toBe(false);
  });
});
