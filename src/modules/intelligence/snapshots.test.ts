import { describe, expect, it } from "vitest";
import { compareOpportunitySnapshots } from "@/modules/intelligence/snapshots";

describe("opportunity snapshots", () => {
  it("ranks the current run and diffs matching keys", () => {
    const compared = compareOpportunitySnapshots(
      [
        { key: "knowledge_assist", title: "Knowledge Assist", score: 70 },
        { key: "case_service_agent", title: "Case Service Agent", score: 80 },
      ],
      [
        { key: "case_service_agent", title: "Case Service Agent", score: 70 },
        { key: "knowledge_assist", title: "Knowledge Assist", score: 70 },
      ],
    );

    expect(compared.map((item) => item.key)).toEqual([
      "case_service_agent",
      "knowledge_assist",
    ]);
    expect(compared[0]?.delta).toBe(10);
    expect(compared[1]?.delta).toBe(0);
  });

  it("leaves delta empty on the first snapshot", () => {
    const compared = compareOpportunitySnapshots(
      [{ key: "knowledge_assist", title: "Knowledge Assist", score: 35 }],
      null,
    );

    expect(compared[0]?.previousScore).toBeNull();
    expect(compared[0]?.delta).toBeNull();
  });
});
