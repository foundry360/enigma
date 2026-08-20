import type { Evidence } from "@/modules/intelligence/types";
import type { AssessmentFacts } from "@/modules/intelligence/types";
import { workCatalog } from "@/modules/intelligence/signals";
import type {
  AccessInsight,
  AutomationInsight,
  DataInsight,
  EnvironmentProfile,
  IntelligenceFinding,
  KnowledgeInsight,
  OrgIntelligence,
  OrgIntelligenceSummary,
  ProcessInsight,
  WorkloadInsight,
  WorkObjectInsight,
} from "@/modules/intelligence/org-model";

export function buildOrgIntelligence(
  facts: AssessmentFacts,
  options?: { opportunityName?: string | null },
): OrgIntelligence {
  const environment = environmentProfile(facts);
  const workload = workloadInsight(facts);
  const process = processInsight(facts);
  const data = dataInsight(facts);
  const knowledge = knowledgeInsight(facts);
  const automation = automationInsight(facts);
  const access = accessInsight(facts);
  const integration = {
    observed: [] as string[],
    available: false,
    gap: "Connected-system inventory is not available from the current connector. Named credentials, connected apps, and outbound integrations were not read.",
  };
  const platform = platformInsight(facts);
  const findings = [
    ...environmentFindings(environment),
    ...workloadFindings(facts, workload),
    ...processFindings(facts, process),
    ...dataFindings(facts, data),
    ...knowledgeFindings(facts, knowledge),
    ...automationFindings(facts, automation),
    ...accessFindings(facts, access),
    ...integrationFindings(integration.gap),
    ...platformFindings(facts, platform.constraints.length),
  ];

  return {
    version: 1,
    environment,
    workload,
    process,
    data,
    knowledge,
    automation,
    access,
    integration,
    platform,
    findings,
    summary: summarizeOrg(findings, options?.opportunityName ?? null, {
      volumeAvailable: workload.volumeAvailable,
      qualityAvailable: data.qualityAvailable,
      integrationsAvailable: integration.available,
    }),
  };
}

function environmentProfile(facts: AssessmentFacts): EnvironmentProfile {
  const org = facts.connection?.org;
  return {
    platform: facts.connection?.platformType === "SALESFORCE" ? "Salesforce" : "Connected platform",
    edition: org?.organizationType ?? null,
    instanceKind: facts.connection?.instanceKind ?? org?.instanceKind ?? "unknown",
    orgName: facts.connection?.externalOrgName ?? org?.name ?? null,
    orgId: facts.connection?.externalOrgId ?? org?.orgId ?? null,
    connectionStatus: facts.connection?.status ?? null,
    objectCount: facts.objects.length || null,
    customObjectCount: facts.objects.filter((item) => item.custom).length || null,
    userPopulation: { value: null, basis: "unknown" },
  };
}

function workloadInsight(facts: AssessmentFacts): WorkloadInsight {
  const present = new Map(facts.objects.map((item) => [item.apiName, item]));
  const cataloged = workCatalog.flatMap((entry) => {
    const object = present.get(entry.apiName);
    if (!object) {
      return [];
    }
    const role =
      entry.kind === "service" ? ("primary" as const) : ("context" as const);
    return [
      {
        apiName: entry.apiName,
        label: object.label,
        kind: entry.kind,
        role: entry.kind === "service" && entry.apiName !== "Case" && present.has("Case")
          ? ("secondary" as const)
          : role,
        volume: { value: null, basis: "unknown" as const },
      } satisfies WorkObjectInsight,
    ];
  });

  const supporting = ["Task", "EmailMessage"]
    .map((apiName) => present.get(apiName) ?? (facts.describes[apiName]
      ? { apiName, label: facts.describes[apiName].label, custom: false, queryable: true }
      : null))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      apiName: item.apiName,
      label: item.label,
      kind: "supporting" as const,
      role: "secondary" as const,
      volume: { value: null, basis: "unknown" as const },
    }));

  const primary = cataloged.filter((item) => item.role === "primary");
  const secondary = [
    ...cataloged.filter((item) => item.role === "secondary"),
    ...supporting,
  ];
  const context = cataloged.filter((item) => item.role === "context");

  return {
    primary,
    secondary,
    context,
    volumeAvailable: false,
    volumeGap:
      "Record volume, open backlog, and recent activity are not available. Discovery is metadata-only. An allowlisted aggregate-count tool would be required to observe workload size.",
  };
}

function processInsight(facts: AssessmentFacts): ProcessInsight {
  const observedPaths = ["Case", "WorkOrder", "Incident", "Lead", "Opportunity"]
    .flatMap((apiName) => {
      const described = facts.describes[apiName];
      const statuses = described?.fields
        .filter((field) => /^(status|stagename)$/i.test(field.apiName))
        .flatMap((field) => field.picklistLabels ?? []);
      if (!described || !statuses?.length) {
        return [];
      }
      return [
        {
          objectLabel: described.label,
          stages: statuses,
          provenance: "observed" as const,
          confidence: "high" as const,
        },
      ];
    });

  const inferredPaths = observedPaths
    .filter((path) => /case/i.test(path.objectLabel))
    .map((path) => ({
      objectLabel: path.objectLabel,
      stages: path.stages,
      provenance: "inferred" as const,
      confidence: "medium" as const,
    }));

  return {
    observedPaths,
    inferredPaths,
    assignment: (facts.process?.assignmentRules ?? [])
      .filter((rule) => rule.active)
      .map((rule) => `${rule.name} on ${rule.objectApiName}`),
    hours: (facts.process?.businessHours ?? [])
      .filter((item) => item.active)
      .map((item) => item.name),
  };
}

function dataInsight(facts: AssessmentFacts): DataInsight {
  const objects = Object.values(facts.describes).map((described) => ({
    label: described.label,
    fieldCount: described.fields.length,
    requiredCount: described.fields.filter((field) => field.required).length,
    qualityAvailable: false,
  }));

  return {
    objects,
    qualityAvailable: false,
    qualityGap:
      "Null rates, completeness, and duplicate indicators were not read. Metadata requiredness is observed; data quality statistics require an allowlisted aggregate that does not return CRM rows.",
  };
}

function knowledgeInsight(facts: AssessmentFacts): KnowledgeInsight {
  return {
    enabled: Boolean(facts.knowledge?.enabled),
    sources: (facts.knowledge?.articleObjects ?? []).map(humanize),
    categories: facts.knowledge?.dataCategories ?? [],
    coverageKnown: false,
    freshnessKnown: false,
  };
}

function automationInsight(facts: AssessmentFacts): AutomationInsight {
  const active = facts.automations.filter(
    (item) => !item.status || /active/i.test(item.status),
  );
  return {
    total: facts.automations.length,
    active: active.length,
    named: active.slice(0, 8).map((item) => item.name),
    objectsTouched: [
      ...new Set(
        active
          .map((item) => item.objectApiName)
          .filter((item): item is string => Boolean(item)),
      ),
    ],
  };
}

function accessInsight(facts: AssessmentFacts): AccessInsight {
  const profileCount = facts.security?.profileCount ?? null;
  const permissionSetCount = facts.security?.permissionSetCount ?? null;
  const total = (profileCount ?? 0) + (permissionSetCount ?? 0);
  return {
    profileCount,
    permissionSetCount,
    namedProfiles: (facts.security?.profileNames ?? []).slice(0, 8),
    isolation:
      facts.security == null
        ? "unknown"
        : total > 80
          ? "sprawling"
          : "focused",
  };
}

function platformInsight(facts: AssessmentFacts): OrgIntelligence["platform"] {
  const constraints: OrgIntelligence["platform"]["constraints"] = [];
  const api = facts.limits?.dailyApiRequests;
  if (api && api.max > 0 && api.remaining / api.max < 0.2) {
    constraints.push({
      title: "Daily API headroom is thin",
      detail: `${api.remaining} of ${api.max} daily API requests remain.`,
      affects: ["scale", "consumption"],
    });
  }
  const storage = facts.limits?.dataStorageMb;
  if (storage && storage.max > 0 && storage.remaining / storage.max < 0.15) {
    constraints.push({
      title: "Data storage is constrained",
      detail: `${storage.remaining} MB of ${storage.max} MB remain.`,
      affects: ["deployment", "scale"],
    });
  }
  return { constraints };
}

function environmentFindings(
  environment: EnvironmentProfile,
): IntelligenceFinding[] {
  if (!environment.orgName) {
    return [
      finding({
        id: "env-unknown",
        domain: "environment",
        title: "The connected environment could not be identified",
        summary: "Connection identity was not available on this run.",
        evidence: cite("get_connection", "Connection identity was not read."),
        provenance: "unknown",
        confidence: "low",
        businessImplication: "Org identity has to be confirmed before this run can be presented as environment intelligence.",
        nextAction: "Reconnect the environment and re-run intelligence.",
        relatedSignals: [],
      }),
    ];
  }

  const kind =
    environment.instanceKind === "unknown"
      ? "an unidentified instance"
      : `a ${environment.instanceKind} ${environment.platform} environment`;
  return [
    finding({
      id: "env-identity",
      domain: "environment",
      title: `${environment.orgName} is the connected environment`,
      summary: `${environment.orgName} is ${kind}${
        environment.edition ? `, ${environment.edition}` : ""
      }. User population was not observed.`,
      evidence: cite(
        "get_connection",
        `${environment.orgName}${environment.edition ? `, ${environment.edition}` : ""}.`,
      ),
      provenance: "observed",
      confidence: "high",
      businessImplication: "This is the environment Enigma studied. Findings apply to this org, not a generic platform.",
      nextAction: "Keep discovery scoped to this connected environment.",
      relatedSignals: [],
    }),
  ];
}

function workloadFindings(
  facts: AssessmentFacts,
  workload: WorkloadInsight,
): IntelligenceFinding[] {
  const primary = workload.primary[0];
  if (!primary) {
    return [
      finding({
        id: "work-missing",
        domain: "workload",
        title: "No durable service work object was found",
        summary: "The run did not find Case, Work Order, or Incident as queryable work.",
        evidence: cite("list_objects", "No service, customer, or revenue work objects were found."),
        provenance: "observed",
        confidence: "high",
        businessImplication: "An agent has no durable record to sit on.",
        consumptionImplication: "A consumption forecast would invent the work object first.",
        nextAction: "Confirm whether service work lives in this org under a different object.",
        relatedSignals: ["addressable_work"],
      }),
    ];
  }

  const described = facts.describes[primary.apiName];
  const secondary = [...workload.secondary, ...workload.context]
    .map((item) => item.label)
    .slice(0, 6);
  return [
    finding({
      id: "work-primary",
      domain: "workload",
      title: `${primary.label} is the primary durable service work object`,
      summary: `${primary.label} appears to be the durable record around which service activity is organized${
        secondary.length
          ? `, with ${joinAnd(secondary)} around that path`
          : ""
      }. Record volume was not observed.`,
      evidence: [
        ...cite(
          "list_objects",
          `Work objects: ${[primary, ...workload.secondary, ...workload.context].map((item) => item.label).join(", ")}.`,
        ),
        ...(described
          ? cite(
              "describe_object",
              `${primary.label} has ${described.fields.length} fields (${described.fields.filter((field) => field.required).length} required).`,
            )
          : []),
      ],
      provenance: "inferred",
      confidence: "high",
      businessImplication: `${primary.label} is the work an agent would read and act on.`,
      consumptionImplication: "Volume can attach to existing work once the customer provides work per year.",
      deploymentImplication: "Start the first topic on this object, not a new system of record.",
      nextAction: "Validate how this work is assigned and closed before designing a topic.",
      relatedSignals: ["addressable_work", "operating_path"],
    }),
    finding({
      id: "work-volume",
      domain: "workload",
      title: "Workload volume was not observed",
      summary: workload.volumeGap ?? "Record counts were not read.",
      evidence: cite("list_objects", "Metadata-only discovery. Record counts were not requested."),
      provenance: "unknown",
      confidence: "high",
      businessImplication: "Addressable volume stays a customer input until an aggregate count is allowed.",
      nextAction: "Enter work per year on the Business Case, or add an allowlisted count tool later.",
      relatedSignals: ["addressable_work"],
    }),
  ];
}

function processFindings(
  facts: AssessmentFacts,
  process: ProcessInsight,
): IntelligenceFinding[] {
  const casePath = process.observedPaths.find((path) => /case/i.test(path.objectLabel));
  if (!casePath) {
    return [
      finding({
        id: "process-missing",
        domain: "process",
        title: "No observed service lifecycle",
        summary: "Statuses on a service work object were not read.",
        evidence: cite("describe_object", "No service or revenue path statuses were stored."),
        provenance: "unknown",
        confidence: "low",
        businessImplication: "An operating path cannot be claimed from object presence alone.",
        nextAction: "Describe the service object and re-run intelligence.",
        relatedSignals: ["operating_path"],
      }),
    ];
  }

  const assignment = process.assignment.length
    ? ` Assignment rules observed: ${joinAnd(process.assignment)}.`
    : " No assignment rules were named.";
  return [
    finding({
      id: "process-lifecycle",
      domain: "process",
      title: `${casePath.objectLabel} has an observed service lifecycle`,
      summary: `Observed ${casePath.objectLabel} statuses: ${joinAnd(casePath.stages)}.${assignment} That suggests a recognizable service path. The handoff itself was not observed as a documented process.`,
      evidence: cite(
        "describe_object",
        `${casePath.objectLabel} statuses: ${casePath.stages.join(", ")}.`,
      ),
      provenance: "inferred",
      confidence: "medium",
      businessImplication: "Conversations can be counted against a known start and close, not unbounded chat.",
      consumptionImplication: "A topic can sit on this path once one handoff is named.",
      nextAction: "Map the human handoff on this path before automating it.",
      relatedSignals: ["operating_path"],
    }),
  ];
}

function dataFindings(
  facts: AssessmentFacts,
  data: DataInsight,
): IntelligenceFinding[] {
  const service = data.objects.find((item) => /case/i.test(item.label)) ?? data.objects[0];
  if (!service) {
    return [];
  }

  return [
    finding({
      id: "data-requiredness",
      domain: "data",
      title: `${service.label} has a configurable field surface with limited requiredness`,
      summary: `${service.label} has ${service.fieldCount} fields, ${service.requiredCount} required. Completeness, null rates, and duplicates were not observed.`,
      evidence: cite(
        "describe_object",
        `${service.label} has ${service.fieldCount} fields (${service.requiredCount} required).`,
      ),
      provenance: "observed",
      confidence: "high",
      businessImplication: "Field presence is not data quality. Write-back should stay narrow until requiredness and completeness are validated.",
      deploymentImplication: "Do not treat this object as an unconstrained write target.",
      nextAction: "Decide which fields an agent may write, and lock the rest.",
      relatedSignals: ["writeback_control", "addressable_work"],
    }),
    finding({
      id: "data-quality-unknown",
      domain: "data",
      title: "Data quality statistics were not observed",
      summary: data.qualityGap ?? "Quality metrics were not read.",
      evidence: cite("describe_object", "Requiredness is metadata. Row-level quality was not read."),
      provenance: "unknown",
      confidence: "high",
      businessImplication: "Do not present completeness percentages. They were not measured.",
      nextAction: "Validate a sample of live records with the customer, or add an allowlisted aggregate later.",
      relatedSignals: ["writeback_control"],
    }),
  ];
}

function knowledgeFindings(
  facts: AssessmentFacts,
  knowledge: KnowledgeInsight,
): IntelligenceFinding[] {
  if (!knowledge.enabled || knowledge.sources.length === 0) {
    return [
      finding({
        id: "knowledge-missing",
        domain: "knowledge",
        title: "No approved content source was found",
        summary: "Answers would be invented or pulled from outside the org.",
        evidence: cite("knowledge_posture", "No approved knowledge sources were found."),
        provenance: "observed",
        confidence: "high",
        businessImplication: "Grounded answers are not supported yet.",
        nextAction: "Identify one approved content source before a customer-facing topic.",
        relatedSignals: ["grounded_answers"],
      }),
    ];
  }

  return [
    finding({
      id: "knowledge-present",
      domain: "knowledge",
      title: "Approved knowledge exists and can support grounded responses",
      summary: `Approved content is present in ${joinAnd(knowledge.sources)}${
        knowledge.categories.length
          ? `, with categories ${joinAnd(knowledge.categories.slice(0, 6))}`
          : ""
      }. Coverage and freshness for the highest-volume service reasons have not been validated.`,
      evidence: cite(
        "knowledge_posture",
        `Approved content sources: ${knowledge.sources.join(", ")}.`,
      ),
      provenance: "inferred",
      confidence: "medium",
      businessImplication: "An agent can retrieve instead of invent, once one high-volume reason is approved.",
      nextAction: "Validate coverage and freshness for one high-volume topic before expanding.",
      relatedSignals: ["grounded_answers"],
    }),
  ];
}

function automationFindings(
  facts: AssessmentFacts,
  automation: AutomationInsight,
): IntelligenceFinding[] {
  if (automation.active === 0) {
    return [
      finding({
        id: "automation-thin",
        domain: "automation",
        title: "No active automation was identified on the observed service path",
        summary: `${automation.total} automations were read, ${automation.active} active. That may simplify initial agent orchestration, and it may also mean assignment and handoff remain human-managed. Absence is not scored as good or bad.`,
        evidence: cite(
          "list_automations",
          `${automation.total} automations (${automation.active} active).`,
        ),
        provenance: "observed",
        confidence: "high",
        businessImplication: "An agent is less likely to fight existing flows, and more likely to become the first system of action.",
        nextAction: "Start with a narrow topic and add a handoff only where the agent should stop.",
        relatedSignals: ["automation_collision"],
      }),
    ];
  }

  return [
    finding({
      id: "automation-present",
      domain: "automation",
      title: "Active automation can write the same work an agent would touch",
      summary: `${automation.active} active automations were identified${
        automation.objectsTouched.length
          ? ` on ${joinAnd(automation.objectsTouched)}`
          : ""
      }. Agent write-back to those objects should be tested for collision.`,
      evidence: cite(
        "list_automations",
        `${automation.total} automations (${automation.active} active).`,
      ),
      provenance: "observed",
      confidence: "high",
      businessImplication: "Forecast volume should assume overlap, not clean deflection.",
      nextAction: "Inventory active automations that write the same work the agent will touch.",
      relatedSignals: ["automation_collision", "writeback_control"],
    }),
  ];
}

function accessFindings(
  facts: AssessmentFacts,
  access: AccessInsight,
): IntelligenceFinding[] {
  if (access.profileCount == null) {
    return [
      finding({
        id: "access-unknown",
        domain: "access",
        title: "Access control could not be read",
        summary: "Profiles and permission sets were not available.",
        evidence: cite("security_summary", "Access control could not be read."),
        provenance: "unknown",
        confidence: "low",
        businessImplication: "An agent identity cannot be judged.",
        nextAction: "Re-run intelligence after security_summary succeeds.",
        relatedSignals: ["access_surface"],
      }),
    ];
  }

  return [
    finding({
      id: "access-surface",
      domain: "access",
      title:
        access.isolation === "sprawling"
          ? "The permission model is broad and should be isolated for an agent identity"
          : "Access can be constrained to a dedicated agent identity",
      summary: `${access.profileCount} profiles and ${access.permissionSetCount ?? 0} permission sets were read. ${
        access.isolation === "sprawling"
          ? "A dedicated agent identity is preferable to inheriting a human user's access."
          : "The surface looks focused enough to scope an agent permission set."
      } Object- and field-level access for an agent was not mapped.`,
      evidence: cite(
        "security_summary",
        `${access.profileCount} profiles and ${access.permissionSetCount ?? 0} permission sets.`,
      ),
      provenance: "inferred",
      confidence: "medium",
      businessImplication: "Least-privilege for an agent is a deployment condition, not a profile roster.",
      nextAction: "Use a dedicated agent permission set; do not reuse a broad human profile.",
      relatedSignals: ["access_surface"],
    }),
  ];
}

function integrationFindings(gap: string): IntelligenceFinding[] {
  return [
    finding({
      id: "integration-unknown",
      domain: "integration",
      title: "External-system integrations were not observed",
      summary: gap,
      evidence: cite("get_connection", "Integration inventory is not in the current tool catalog."),
      provenance: "unknown",
      confidence: "high",
      businessImplication: "Autonomous resolution should not be assumed if Case depends on systems outside this org.",
      nextAction: "Ask the customer which systems Case resolution depends on, or add a connected-app inventory tool later.",
      relatedSignals: [],
    }),
  ];
}

function platformFindings(
  facts: AssessmentFacts,
  constraintCount: number,
): IntelligenceFinding[] {
  if (!facts.limits) {
    return [
      finding({
        id: "platform-unread",
        domain: "platform",
        title: "Platform limits were not read",
        summary: "API and storage headroom were not available on this run.",
        evidence: cite("org_limits", "Org limits were not stored."),
        provenance: "unknown",
        confidence: "low",
        businessImplication: "Scale constraints cannot be judged from this run.",
        nextAction: "Re-run intelligence to read API and storage limits.",
        relatedSignals: [],
      }),
    ];
  }

  if (constraintCount === 0) {
    return [
      finding({
        id: "platform-headroom",
        domain: "platform",
        title: "No platform limit on this run looks tight enough to block a narrow pilot",
        summary: "API and storage were read. Remaining headroom is not a deployment constraint for a focused topic.",
        evidence: cite("org_limits", "API and storage limits were read."),
        provenance: "observed",
        confidence: "medium",
        businessImplication: "Platform capacity is not the hold. Access and write-back still are.",
        nextAction: "Do not treat limits as a reason to defer a narrow service topic.",
        relatedSignals: [],
      }),
    ];
  }

  return [
    finding({
      id: "platform-tight",
      domain: "platform",
      title: "A platform limit could constrain scale",
      summary: "At least one API or storage limit is thin enough to matter for consumption or scale.",
      evidence: cite("org_limits", "A remaining limit is below the headroom threshold."),
      provenance: "calculated",
      confidence: "medium",
      businessImplication: "A high-volume rollout should check remaining capacity, not only process fit.",
      nextAction: "Review the thin limit before expanding beyond a pilot.",
      relatedSignals: [],
    }),
  ];
}

function notObservedGaps(input: {
  volumeAvailable: boolean;
  qualityAvailable: boolean;
  integrationsAvailable: boolean;
}) {
  return [
    !input.volumeAvailable ? "Workload volume was not observed" : null,
    !input.qualityAvailable ? "Data quality statistics were not observed" : null,
    !input.integrationsAvailable
      ? "External-system integrations were not observed"
      : null,
  ].filter((item): item is string => Boolean(item));
}

function summarizeOrg(
  findings: IntelligenceFinding[],
  opportunityName: string | null,
  availability: {
    volumeAvailable: boolean;
    qualityAvailable: boolean;
    integrationsAvailable: boolean;
  },
): OrgIntelligenceSummary {
  const notObserved = notObservedGaps(availability);
  const learned = findings
    .filter((item) => item.provenance !== "unknown")
    .slice(0, 6)
    .map((item) => item.title);
  const constraints = [
    ...notObserved,
    ...findings
      .filter(
        (item) =>
          item.relatedSignals.includes("writeback_control") ||
          item.relatedSignals.includes("access_surface") ||
          item.id === "knowledge-present",
      )
      .map((item) => item.title),
  ].slice(0, 6);
  const hasService = findings.some((item) => item.id === "work-primary");
  const writeThin = findings.some((item) => item.id === "data-requiredness");
  const accessBroad = findings.some((item) => /broad/.test(item.title));

  return {
    learned,
    notObserved,
    meaning: hasService
      ? `The environment appears suitable for a focused Service agent opportunity${
          writeThin || accessBroad
            ? ", but production should begin with narrow access and controlled write-back"
            : ""
        }.`
      : "The environment does not yet show a durable service work object an agent can sit on.",
    constraints: constraints.length
      ? constraints
      : ["Nothing on this run is a named constraint yet."],
    strongestOpportunity: opportunityName,
    nextStep: hasService
      ? "Validate the service lifecycle, knowledge coverage for one topic, and agent write boundaries before deployment design."
      : "Confirm where operational work lives before opening a Business Case.",
  };
}

function finding(
  input: Omit<IntelligenceFinding, "evidence"> & { evidence: Evidence[] },
): IntelligenceFinding {
  return input;
}

function cite(tool: Evidence["tool"], citation: string): Evidence[] {
  return [{ tool, citation }];
}

function humanize(value: string) {
  return value.replace(/__kav$/i, "").replace(/_/g, " ");
}

function joinAnd(values: string[]) {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

export function formatOrgIntelligenceBrief(model: OrgIntelligence) {
  const notObserved = notObservedFromModel(model);
  const findings = model.findings
    .map(
      (item) =>
        `${item.title} [${item.provenance}/${item.confidence}]. ${item.summary}`,
    )
    .join("\n");
  return [
    `Organization intelligence. ${model.environment.orgName ?? "Connected environment"}.`,
    `What Enigma learned. ${model.summary.learned.join(" ")}`,
    notObserved.length
      ? `What was not observed. ${notObserved.join(". ")}.`
      : null,
    `What this means. ${model.summary.meaning}`,
    `Key constraints. ${model.summary.constraints.join(" ")}`,
    model.summary.strongestOpportunity
      ? `Strongest opportunity. ${model.summary.strongestOpportunity}.`
      : "No opportunity candidate was attached.",
    `Recommended next step. ${model.summary.nextStep}`,
    findings ? `Findings.\n${findings}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function notObservedFromModel(model: OrgIntelligence) {
  if (model.summary.notObserved?.length) {
    return model.summary.notObserved;
  }

  return notObservedGaps({
    volumeAvailable: model.workload.volumeAvailable,
    qualityAvailable: model.data.qualityAvailable,
    integrationsAvailable: model.integration.available,
  });
}
