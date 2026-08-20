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

  it("turns a named inventory into a bullet list", () => {
    const answer = formatAskAnswer(
      "The run cited 44 profiles: Analytics Cloud Integration User, Chatter Free User, Standard User, System Administrator, Marketing User. I will not invent names that were not stored.",
    );

    expect(answer).toContain("The run cited 44 profiles.");
    expect(answer).toContain("- Analytics Cloud Integration User");
    expect(answer).toContain("- System Administrator");
    expect(answer).toContain("I will not invent names that were not stored.");
    expect(answer).not.toMatch(/44 profiles: Analytics Cloud/);
  });

  it("keeps an existing bullet list", () => {
    const answer = formatAskAnswer(
      "This run named these work objects.\n- Case\n- Account\n- Opportunity",
    );

    expect(answer).toContain("This run named these work objects.");
    expect(answer).toContain("- Case");
    expect(answer).toContain("- Opportunity");
  });

  it("does not turn ordinary prose commas into bullets", () => {
    const answer = formatAskAnswer(
      "If they do, the agent can duplicate or fight those paths, create cleanup, and inflate consumption.",
    );
    expect(answer).not.toMatch(/^- /m);
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
    expect(
      looksLikeAskDump(
        "The run cited 44 profiles: Analytics Cloud Integration User, Chatter Free User, Standard User, System Administrator, Marketing User, Solution Manager, Contract Manager, Read Only, Partner Community User, Customer Community User, Identity User, Gold Partner User.",
      ),
    ).toBe(true);
    expect(
      looksLikeAskDump(
        "The run cited 44 profiles: Analytics Cloud Integration User, Chatter Free User, Standard User, System Administrator, Marketing User, Solution Manager, Contract Manager, Read Only, Partner Community User, Customer Community User, Identity User, Gold Partner User.",
        "How many profiles were read in the org and what are they?",
      ),
    ).toBe(false);
    expect(
      looksLikeAskDump(
        "Automation collision means existing automations may already write the same work an agent would touch. If they do, the agent can duplicate or fight those paths, create cleanup, inflate consumption, and make the forecast dishonest. On this run, discovery found 0 active automations, so there is nothing to collide with, and the score is mixed, not weak, because ownership of the path may stay informal.",
      ),
    ).toBe(false);
  });
});
