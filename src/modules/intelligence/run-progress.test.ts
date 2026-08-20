import { describe, expect, it } from "vitest";
import {
  initialRunProgress,
  parseRunProgress,
  progressForStage,
  advanceRunProgress,
} from "@/modules/intelligence/run-progress";

describe("intelligence run progress", () => {
  it("starts on connect with an empty bar", () => {
    const progress = initialRunProgress();
    expect(progress.stage).toBe("Understanding the operating environment");
    expect(progress.percent).toBe(0);
    expect(progress.done).toBe(false);
  });

  it("advances the bar as earlier stages complete", () => {
    expect(progressForStage("map").percent).toBe(17);
    expect(progressForStage("map").stage).toBe(
      "Mapping work, data, and processes",
    );
    expect(progressForStage("save").percent).toBe(83);
    expect(progressForStage("save", true).percent).toBe(100);
    expect(progressForStage("save", true).done).toBe(true);
  });

  it("reads stored progress by stage id", () => {
    expect(parseRunProgress({ id: "fit" })?.stage).toBe(
      "Identifying agent opportunities",
    );
    expect(parseRunProgress({ id: "unknown" })).toBeNull();
  });

  it("does not fall back to the first stage after later stages have started", () => {
    const current = progressForStage("save");
    expect(advanceRunProgress(current, progressForStage("connect")).stage).toBe(
      "Preparing your intelligence brief",
    );
    expect(
      advanceRunProgress(current, progressForStage("save", true)).percent,
    ).toBe(100);
  });
});
