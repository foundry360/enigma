import { describe, expect, it } from "vitest";
import { createProjectSchema } from "@/lib/validations/auth";

describe("createProjectSchema", () => {
  const valid = {
    name: "Customer Service AI Transformation",
    organizationId: "11111111-1111-4111-8111-111111111111",
    projectType: "Agentforce",
    objective: "Identify opportunities to automate customer service operations.",
    outcomes: ["Improve customer experience", "Automate manual processes"],
    ownerId: "user-1",
    status: "Planning",
    platforms: ["SALESFORCE", "SERVICENOW"],
  };

  it("accepts a business-focused project without a connection", () => {
    const parsed = createProjectSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("requires an outcome and objective", () => {
    const parsed = createProjectSchema.safeParse({
      ...valid,
      objective: "Short",
      outcomes: [],
    });
    expect(parsed.success).toBe(false);
  });
});
