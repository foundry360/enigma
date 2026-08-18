import { describe, expect, it } from "vitest";
import {
  consumptionPosture,
  forecastConfidence,
} from "@/modules/intelligence/consumption";

describe("consumption posture", () => {
  it("maps score bands to forecast confidence", () => {
    expect(forecastConfidence(80)).toBe("high");
    expect(forecastConfidence(60)).toBe("medium");
    expect(forecastConfidence(20)).toBe("low");
  });

  it("proposes a consumption driver without inventing prices", () => {
    const posture = consumptionPosture({
      key: "case_service_agent",
      score: 70,
    });

    expect(posture.driver).toMatch(/Service/i);
    expect(posture.confidence).toBe("medium");
    expect(JSON.stringify(posture)).not.toMatch(/\$\d/);
    expect(JSON.stringify(posture).toLowerCase()).not.toContain("list price");
  });
});
