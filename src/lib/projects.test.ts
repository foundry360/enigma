import { describe, expect, it } from "vitest";
import { projectProgress } from "@/lib/projects";

describe("projectProgress", () => {
  it("starts in Connect before a platform is connected", () => {
    expect(projectProgress({ connected: false })).toMatchObject({
      current: "Connect",
      completed: 0,
      total: 6,
    });
  });

  it("moves to Discover after a platform is connected", () => {
    expect(projectProgress({ connected: true })).toMatchObject({
      current: "Discover",
      completed: 1,
    });
  });

  it("stays in Discover for a draft or failed run", () => {
    expect(
      projectProgress({ connected: true, assessmentStatus: "DRAFT" }),
    ).toMatchObject({
      current: "Discover",
      completed: 1,
    });
  });

  it("moves to Assess while discovery is in progress", () => {
    expect(
      projectProgress({ connected: true, assessmentStatus: "DISCOVERING" }),
    ).toMatchObject({
      current: "Assess",
      completed: 2,
    });
  });

  it("moves to Prioritize after assessment is complete", () => {
    expect(
      projectProgress({ connected: true, assessmentStatus: "COMPLETE" }),
    ).toMatchObject({
      current: "Prioritize",
      completed: 3,
    });
  });

  it("moves to Model when a business case exists", () => {
    expect(
      projectProgress({
        connected: true,
        assessmentStatus: "COMPLETE",
        hasBusinessCase: true,
      }),
    ).toMatchObject({
      current: "Model",
      completed: 4,
    });
  });

  it("moves to Recommend when the business case is approved", () => {
    expect(
      projectProgress({
        connected: true,
        assessmentStatus: "COMPLETE",
        hasBusinessCase: true,
        businessCaseStatus: "approved",
      }),
    ).toMatchObject({
      current: "Recommend",
      completed: 5,
    });
  });
});
