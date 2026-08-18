import type {
  AssessmentFacts,
  Judgment,
} from "@/modules/intelligence/types";

export function scoreAssessment(facts: AssessmentFacts): Judgment[] {
  return [...scoreReadiness(facts), ...detectOpportunities(facts)];
}

export type ReadinessRisk = "low" | "medium" | "high";

export function readinessRisk(score: number | null): ReadinessRisk | null {
  if (score === null) {
    return null;
  }

  if (score >= 75) {
    return "low";
  }

  if (score >= 45) {
    return "medium";
  }

  return "high";
}

export function overallFinding(input: {
  overallScore: number;
  dimensions: { title: string; score: number }[];
}) {
  const strongest = [...input.dimensions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .filter((item) => item.score >= 70);
  const weakest = [...input.dimensions]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .filter((item) => item.score < 70);

  if (input.dimensions.length === 0) {
    return "No readiness dimensions were scored. Run an assessment against a connected org.";
  }

  const headline =
    input.overallScore >= 75
      ? "The org is ready enough to pilot a narrow Agentforce topic."
      : input.overallScore >= 45
        ? "The org has the objects for an agent, but the operating model is uneven."
        : "The org is not ready for a customer-facing agent without foundational work.";

  const strength =
    strongest.length > 0
      ? ` Strongest: ${strongest.map((item) => `${item.title} ${item.score}`).join(", ")}.`
      : "";
  const gap =
    weakest.length > 0
      ? ` Gaps: ${weakest.map((item) => `${item.title} ${item.score}`).join(", ")}.`
      : "";

  return `${headline}${strength}${gap}`;
}

export function overallScore(judgments: Judgment[]) {
  const dimensions = judgments.filter((item) => item.kind === "dimension");
  if (dimensions.length === 0) {
    return 0;
  }

  return Math.round(
    dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length,
  );
}

export function scoreReadiness(facts: AssessmentFacts): Judgment[] {
  const present = new Set(facts.objects.map((object) => object.apiName));
  const caseObject = present.has("Case");
  const account = present.has("Account");
  const contact = present.has("Contact");
  const caseFields = facts.describes.Case?.fields.length ?? 0;
  const activeFlows = facts.automations.filter(
    (item) => item.kind === "flow" && item.status === "Active",
  ).length;
  const apex = facts.automations.filter((item) => item.kind === "apex").length;
  const knowledgeOn = Boolean(facts.knowledge?.enabled);

  const dataScore = clamp(
    (caseObject ? 40 : 0) +
      (account ? 20 : 0) +
      (contact ? 20 : 0) +
      (caseFields >= 20 ? 20 : caseFields > 0 ? 10 : 0),
  );

  const processScore = clamp(
    (caseObject ? 50 : 0) +
      (present.has("Opportunity") ? 25 : 0) +
      (present.has("Lead") ? 25 : 0),
  );

  const knowledgeScore = knowledgeOn ? 80 : 25;

  const automationScore = clamp(
    facts.automations.length === 0
      ? 15
      : 30 + Math.min(activeFlows * 8, 40) + Math.min(apex * 2, 20),
  );

  const profileCount = facts.security?.profileCount ?? 0;
  const permissionSetCount = facts.security?.permissionSetCount ?? 0;
  const securityScore =
    profileCount + permissionSetCount === 0
      ? 20
      : profileCount + permissionSetCount > 80
        ? 40
        : 65;

  const governanceScore =
    facts.validationRules.length === 0
      ? 30
      : facts.validationRules.some((rule) => rule.active)
        ? 60
        : 45;

  return [
    {
      kind: "dimension",
      key: "data",
      title: "Data",
      score: dataScore,
      evidence: [
        {
          tool: "list_objects",
          citation: objectCitation(present, ["Case", "Account", "Contact"]),
        },
        ...(facts.describes.Case
          ? [
              {
                tool: "describe_object" as const,
                citation: `Case has ${caseFields} fields.`,
              },
            ]
          : []),
      ],
      reason: caseObject
        ? "Core service and account objects are present, so an agent has structured work to read."
        : "Key service objects are missing, so an agent has little structured work to ground on.",
      risk: caseObject
        ? "Field quality and requiredness are unknown beyond describe shape."
        : "Without Case or equivalent objects, Agentforce has no durable service record to act on.",
      recommendation: caseObject
        ? "Confirm Case required fields and record types before designing an agent topic."
        : "Stand up Case (or the service object of record) before an Agentforce service use case.",
    },
    {
      kind: "dimension",
      key: "process",
      title: "Process",
      score: processScore,
      evidence: [
        {
          tool: "list_objects",
          citation: objectCitation(present, ["Case", "Lead", "Opportunity"]),
        },
      ],
      reason: processScore >= 50
        ? "A recognizable service or revenue process object exists for an agent to follow."
        : "No clear Case, Lead, or Opportunity process object was found.",
      risk: "Object presence is not the same as a documented process or assignment model.",
      recommendation:
        "Map the human handoffs on the primary object before automating them with an agent.",
    },
    {
      kind: "dimension",
      key: "knowledge",
      title: "Knowledge",
      score: knowledgeScore,
      evidence: [
        {
          tool: "knowledge_posture",
          citation: knowledgeOn
            ? `Knowledge objects present: ${(facts.knowledge?.articleObjects ?? []).join(", ")}.`
            : "No Knowledge article objects were found.",
        },
      ],
      reason: knowledgeOn
        ? "Knowledge article objects are present, so answers can be grounded in published content."
        : "No Knowledge objects were found, so an agent would have to invent or reach outside the org.",
      risk: knowledgeOn
        ? "Article presence is not the same as coverage, freshness, or data categories."
        : "Ungrounded answers create compliance and hallucination risk.",
      recommendation: knowledgeOn
        ? "Review article objects and categories before using them as agent grounding."
        : "Enable Knowledge or another approved content source before a customer-facing agent.",
    },
    {
      kind: "dimension",
      key: "automation",
      title: "Automation",
      score: automationScore,
      evidence: [
        {
          tool: "list_automations",
          citation: `${facts.automations.length} automations (${activeFlows} active flows, ${apex} Apex classes).`,
        },
      ],
      reason:
        facts.automations.length === 0
          ? "No Flow or Apex automations were returned, so work is likely manual today."
          : "Existing automations can either help an agent or collide with it.",
      risk:
        facts.automations.length > 20
          ? "Dense automation increases the chance an agent duplicates or fights existing automation."
          : "Thin automation means the agent may be the first system of action.",
      recommendation:
        facts.automations.length === 0
          ? "Start with a narrow agent topic and add Flow only where the agent should hand off."
          : "Inventory active Flows that write the same objects the agent will touch.",
    },
    {
      kind: "dimension",
      key: "security",
      title: "Security",
      score: securityScore,
      evidence: [
        {
          tool: "security_summary",
          citation: facts.security
            ? `${profileCount} profiles and ${permissionSetCount} permission sets.`
            : "Security summary was not available.",
        },
      ],
      reason: facts.security
        ? "A profile and permission-set estate exists to constrain what an agent user can do."
        : "Security shape could not be read, so agent permissions cannot be judged.",
      risk:
        profileCount + permissionSetCount > 80
          ? "A large permission estate makes least-privilege agent access harder."
          : "An over-privileged agent user is the main security failure mode.",
      recommendation:
        "Create a dedicated agent permission set; do not reuse a broad human profile.",
    },
    {
      kind: "dimension",
      key: "governance",
      title: "Governance",
      score: governanceScore,
      evidence: [
        {
          tool: "list_validation_rules",
          citation: `${facts.validationRules.length} validation rules (${facts.validationRules.filter((rule) => rule.active).length} active).`,
        },
      ],
      reason:
        facts.validationRules.length > 0
          ? "Validation rules show some write-path controls an agent must respect."
          : "No validation rules were returned, so write-path guardrails look thin.",
      risk: "An agent that creates records can bypass process if rules and required fields are weak.",
      recommendation:
        "Decide which Case (or primary object) fields an agent may write, and lock the rest.",
    },
  ];
}

export function detectOpportunities(facts: AssessmentFacts): Judgment[] {
  const present = new Set(facts.objects.map((object) => object.apiName));
  const opportunities: Judgment[] = [];

  if (present.has("Case")) {
    const caseFields = facts.describes.Case?.fields.length ?? 0;
    opportunities.push({
      kind: "opportunity",
      key: "case_service_agent",
      title: "Case Service Agent",
      score: clamp(55 + (caseFields >= 20 ? 15 : 0) + (facts.knowledge?.enabled ? 10 : 0)),
      evidence: [
        {
          tool: "list_objects",
          citation: "Case is present.",
        },
        ...(facts.describes.Case
          ? [
              {
                tool: "describe_object" as const,
                citation: `Case describe returned ${caseFields} fields.`,
              },
            ]
          : []),
      ],
      reason:
        "Case is the durable service record. An agent can draft, route, or summarize work already stored there.",
      risk: "Without Knowledge or clear required fields, the agent may write incomplete or ungrounded Case updates.",
      recommendation:
        "Pilot one Case topic (status, next step, or draft response) before expanding to close or create.",
    });
  }

  opportunities.push({
    kind: "opportunity",
    key: "knowledge_assist",
    title: "Knowledge Assist",
    score: facts.knowledge?.enabled ? 70 : 35,
    evidence: [
      {
        tool: "knowledge_posture",
        citation: facts.knowledge?.enabled
          ? `Knowledge objects: ${(facts.knowledge.articleObjects ?? []).join(", ")}.`
          : "Knowledge article objects were not found.",
      },
    ],
    reason: facts.knowledge?.enabled
      ? "Published knowledge objects exist, so an agent can retrieve approved answers."
      : "There is no Knowledge object to ground answers, so this is a prerequisite more than a use case.",
    risk: facts.knowledge?.enabled
      ? "Stale or thin articles will show up as confident wrong answers."
      : "Building an agent first and knowledge second inverts the dependency.",
    recommendation: facts.knowledge?.enabled
      ? "Use Knowledge retrieval for one high-volume Case reason before any write-back."
      : "Stand up Knowledge (or an approved content source) before a customer-facing Q&A agent.",
  });

  if (present.has("Case") && facts.automations.length < 8) {
    opportunities.push({
      kind: "opportunity",
      key: "guided_case_flow",
      title: "Guided Case Flow",
      score: 50,
      evidence: [
        {
          tool: "list_objects",
          citation: "Case is present.",
        },
        {
          tool: "list_automations",
          citation: `${facts.automations.length} automations returned.`,
        },
      ],
      reason:
        "Case exists and automation is light, so an agent can become the first guided path rather than fighting a dense Flow estate.",
      risk: "The agent may become a shadow process if assignment and SLAs stay informal.",
      recommendation:
        "Pair a narrow agent topic with one Flow for assignment or escalation, not a full rewrite.",
    });
  }

  return opportunities;
}

function objectCitation(present: Set<string>, names: string[]) {
  const found = names.filter((name) => present.has(name));
  const missing = names.filter((name) => !present.has(name));
  return [
    found.length ? `Present: ${found.join(", ")}.` : null,
    missing.length ? `Missing: ${missing.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
