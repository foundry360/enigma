import type {
  AssessmentFacts,
  BusinessSignal,
  Evidence,
  SignalContext,
  SignalKey,
  WorkKind,
} from "@/modules/intelligence/types";

const workCatalog: { apiName: string; kind: WorkKind }[] = [
  { apiName: "Case", kind: "service" },
  { apiName: "Account", kind: "customer" },
  { apiName: "Contact", kind: "customer" },
  { apiName: "Lead", kind: "revenue" },
  { apiName: "Opportunity", kind: "revenue" },
];

export const consumptionImplications = [
  "Volume can attach to existing work, not a new system of record.",
  "A consumption forecast would invent the work object first.",
  "Conversations can be counted against a known path instead of an unbounded chat.",
  "Usage would be unscoped, so a forecast would not stay honest.",
  "Retrieval turns can be forecast against published answers.",
  "Q&A consumption would be ungrounded and the forecast would overstate value.",
  "Usage is more likely to replace manual turns than collide with existing automation.",
  "Forecast volume should assume overlap and exception handling, not clean deflection.",
  "A broad identity will over-consume write actions and make the forecast noisy.",
  "A dedicated agent identity keeps consumption scoped to intended topics.",
  "Failed writes will show up as retries and wasted turns; model them.",
  "Unchecked write-back will inflate consumption and cleanup cost.",
] as const;

export function splitSignalCopy(reason: string) {
  const [meaning, consumption] = reason.split("\n\n");
  if (consumption) {
    return { meaning, consumption };
  }

  const matched = consumptionImplications.find((phrase) =>
    reason.endsWith(phrase),
  );
  if (matched) {
    return {
      meaning: reason.slice(0, reason.length - matched.length).trim(),
      consumption: matched,
    };
  }

  return { meaning: reason, consumption: "" };
}

const signalTitles: Record<SignalKey, string> = {
  addressable_work: "Addressable work",
  operating_path: "Operating path",
  grounded_answers: "Grounded answers",
  automation_collision: "Automation collision",
  access_surface: "Access control",
  writeback_control: "Write-back control",
};

export const signalExplainers: Record<SignalKey, string> = {
  addressable_work:
    "Whether durable work records exist for an agent to read and act on.",
  operating_path:
    "Whether a recognizable service or revenue path exists to start and hand off.",
  grounded_answers:
    "Whether approved content exists so answers can be retrieved instead of invented.",
  automation_collision:
    "How many automations already handle this work, and whether an agent would fight them.",
  access_surface:
    "Can you limit what the agent is allowed to see and change?",
  writeback_control:
    "Whether write-path rules would keep agent-created records complete.",
};

export function signalExplainer(key: string) {
  return Object.hasOwn(signalExplainers, key)
    ? signalExplainers[key as SignalKey]
    : undefined;
}

export function normalizeSignals(facts: AssessmentFacts): SignalContext {
  const objects = new Map(
    facts.objects.map((object) => [object.apiName, object]),
  );
  const work = workCatalog.flatMap((entry) => {
    const object = objects.get(entry.apiName);
    if (!object) {
      return [];
    }

    const described = facts.describes[entry.apiName];
    return [
      {
        kind: entry.kind,
        apiName: entry.apiName,
        label: object.label,
        fieldCount: described?.fields.length ?? 0,
        requiredCount:
          described?.fields.filter((field) => field.required).length ?? 0,
      },
    ];
  });

  const activeAutomations = facts.automations.filter(
    (item) => !item.status || /active/i.test(item.status),
  ).length;
  const writeRules = facts.validationRules.filter((rule) => rule.active).length;
  const profileCount = facts.security?.profileCount ?? 0;
  const permissionSetCount = facts.security?.permissionSetCount ?? 0;
  const permissionEstate = !facts.security
    ? ("unknown" as const)
    : profileCount + permissionSetCount > 80
      ? ("sprawling" as const)
      : ("focused" as const);
  const groundingLabels = facts.knowledge?.enabled
    ? (facts.knowledge.articleObjects ?? []).map(humanizeName)
    : [];

  const context: Omit<SignalContext, "signals"> = {
    workKinds: [...new Set(work.map((item) => item.kind))],
    work: work.map(({ kind, label, fieldCount, requiredCount }) => ({
      kind,
      label,
      fieldCount,
      requiredCount,
    })),
    groundingLabels,
    activeAutomationCount: activeAutomations,
    writeRuleCount: writeRules,
    permissionEstate,
  };

  return {
    ...context,
    signals: [
      addressableWork(context),
      operatingPath(context),
      groundedAnswers(context),
      automationCollision(facts, context),
      accessSurface(facts, context),
      writebackControl(facts, context),
    ],
  };
}

function addressableWork(
  context: Omit<SignalContext, "signals">,
): BusinessSignal {
  const service = context.work.find((item) => item.kind === "service");
  const customer = context.work.filter((item) => item.kind === "customer");
  const rich = (service?.fieldCount ?? 0) >= 20;
  const score = clamp(
    (service ? 40 : 0) +
      (customer.length > 0 ? 20 : 0) +
      (customer.length > 1 ? 20 : 0) +
      (rich ? 20 : service && service.fieldCount > 0 ? 10 : 0),
  );

  return signal("addressable_work", score, {
    evidence: [
      cite(
        "list_objects",
        context.work.length
          ? `Work objects: ${uniqueLabels(context.work)}.`
          : "No service, customer, or revenue work objects were found.",
      ),
      ...(service && service.fieldCount > 0
        ? [
            cite(
              "describe_object",
              `${service.label} has ${service.fieldCount} fields (${service.requiredCount} required).`,
            ),
          ]
        : []),
    ],
    meaning: service
      ? "Service and customer work already lives in durable records, so an agent has structured work to read."
      : "There is no durable service record, so an agent has little operational work to attach to.",
    consumption: service
      ? "Volume can attach to existing work, not a new system of record."
      : "A consumption forecast would invent the work object first.",
    risk: service
      ? "Field presence is not the same as data quality or requiredness in use."
      : "Without a work object, Agentforce has nothing durable to act on.",
    recommendation: service
      ? "Confirm required fields and record types on the service object before designing a topic."
      : "Stand up the service object of record before a service agent use case.",
  });
}

function operatingPath(
  context: Omit<SignalContext, "signals">,
): BusinessSignal {
  const service = context.workKinds.includes("service");
  const revenue = context.workKinds.includes("revenue");
  const score = clamp((service ? 50 : 0) + (revenue ? 50 : 0));
  const labels = uniqueLabels(
    context.work.filter(
      (item) => item.kind === "service" || item.kind === "revenue",
    ),
  );

  return signal("operating_path", score, {
    evidence: [
      cite(
        "list_objects",
        labels
          ? `Operating objects: ${labels}.`
          : "No service or revenue path objects were found.",
      ),
    ],
    meaning:
      score >= 50
        ? "A recognizable service or revenue path exists for an agent to follow."
        : "No clear operating path was found for an agent to start and hand off.",
    consumption:
      score >= 50
        ? "Conversations can be counted against a known path instead of an unbounded chat."
        : "Usage would be unscoped, so a forecast would not stay honest.",
    risk: "Object presence is not the same as assignment, SLA, or a documented handoff.",
    recommendation:
      "Map the human handoffs on the primary path before automating them with an agent.",
  });
}

function groundedAnswers(
  context: Omit<SignalContext, "signals">,
): BusinessSignal {
  const grounded = context.groundingLabels.length > 0;
  const score = grounded ? 80 : 25;

  return signal("grounded_answers", score, {
    evidence: [
      cite(
        "knowledge_posture",
        grounded
          ? `Approved content sources: ${context.groundingLabels.join(", ")}.`
          : "No approved knowledge source was found.",
      ),
    ],
    meaning: grounded
      ? "Approved content exists, so answers can be grounded instead of invented."
      : "There is no approved content source, so an agent would invent or reach outside the org.",
    consumption: grounded
      ? "Retrieval turns can be forecast against published answers."
      : "Q&A consumption would be ungrounded and the forecast would overstate value.",
    risk: grounded
      ? "Source presence is not coverage, freshness, or category depth."
      : "Ungrounded answers create compliance and hallucination risk.",
    recommendation: grounded
      ? "Use retrieval on one high-volume reason before any write-back."
      : "Stand up an approved content source before a customer-facing Q&A agent.",
  });
}

function automationCollision(
  facts: AssessmentFacts,
  context: Omit<SignalContext, "signals">,
): BusinessSignal {
  const count = context.activeAutomationCount;
  const score =
    count === 0 ? 45 : count < 8 ? 70 : count < 20 ? 40 : 25;

  return signal("automation_collision", score, {
    evidence: citeAutomations(facts, count),
    meaning:
      count === 0
        ? "Work looks manual today, so an agent may become the first system of action."
        : count < 8
          ? "Some automation exists, but the estate is light enough that an agent can attach."
          : "Automation is dense, so an agent is likely to duplicate or fight existing paths.",
    consumption:
      count < 8
        ? "Usage is more likely to replace manual turns than collide with existing automation."
        : "Forecast volume should assume overlap and exception handling, not clean deflection.",
    risk:
      count > 20
        ? "Dense automation increases the chance an agent writes the same records as existing automation."
        : "Thin automation means ownership of the path may stay informal.",
    recommendation:
      count === 0
        ? "Start with a narrow topic and add a handoff only where the agent should stop."
        : "Inventory active automations that write the same work the agent will touch.",
  });
}

function accessSurface(
  facts: AssessmentFacts,
  context: Omit<SignalContext, "signals">,
): BusinessSignal {
  const profileCount = facts.security?.profileCount ?? 0;
  const permissionSetCount = facts.security?.permissionSetCount ?? 0;
  const score =
    context.permissionEstate === "unknown"
      ? 20
      : context.permissionEstate === "sprawling"
        ? 40
        : 65;

  return signal("access_surface", score, {
    evidence: [
      cite(
        "security_summary",
        facts.security
          ? `${profileCount} profiles and ${permissionSetCount} permission sets.`
          : "Access control could not be read.",
      ),
    ],
    meaning: facts.security
      ? "An access estate exists to constrain what an agent identity can invoke and change."
      : "Access shape could not be read, so agent permissions cannot be judged.",
    consumption:
      context.permissionEstate === "sprawling"
        ? "A broad identity will over-consume write actions and make the forecast noisy."
        : "A dedicated agent identity keeps consumption scoped to intended topics.",
    risk:
      context.permissionEstate === "sprawling"
        ? "A large permission estate makes least-privilege agent access harder."
        : "An over-privileged agent identity is the main access failure mode.",
    recommendation:
      "Use a dedicated agent permission set; do not reuse a broad human profile.",
  });
}

function writebackControl(
  facts: AssessmentFacts,
  context: Omit<SignalContext, "signals">,
): BusinessSignal {
  const service = context.work.find((item) => item.kind === "service");
  const score =
    context.writeRuleCount === 0 && (service?.requiredCount ?? 0) === 0
      ? 30
      : context.writeRuleCount > 0
        ? 60
        : 45;

  return signal("writeback_control", score, {
    evidence: citeWriteRules(facts, context.writeRuleCount, service),
    meaning:
      score >= 45
        ? "Some write-path controls exist that an agent must respect."
        : "Write-path guardrails look thin, so an agent could create incomplete work.",
    consumption:
      score >= 45
        ? "Failed writes will show up as retries and wasted turns; model them."
        : "Unchecked write-back will inflate consumption and cleanup cost.",
    risk: "An agent that creates records can bypass process if required fields and rules are weak.",
    recommendation:
      "Decide which fields an agent may write, and lock the rest before a write-back pilot.",
  });
}

function signal(
  key: SignalKey,
  score: number,
  rest: Omit<BusinessSignal, "key" | "title" | "strength" | "score">,
): BusinessSignal {
  return {
    key,
    title: signalTitles[key],
    score: clamp(score),
    strength: score >= 75 ? "strong" : score >= 45 ? "mixed" : "weak",
    ...rest,
  };
}

const evidenceNameLimit = 10;

function citeAutomations(
  facts: AssessmentFacts,
  activeCount: number,
): Evidence[] {
  const active = facts.automations.filter(
    (item) => !item.status || /active/i.test(item.status),
  );
  const named = active.slice(0, evidenceNameLimit).map(describeAutomation);
  const extra = active.length - named.length;

  return [
    cite(
      "list_automations",
      `${facts.automations.length} automations (${activeCount} active).`,
    ),
    ...(named.length > 0
      ? [cite("list_automations", `Active automations: ${named.join("; ")}.`)]
      : []),
    ...(extra > 0
      ? [
          cite(
            "list_automations",
            `${extra} more active automations were not listed.`,
          ),
        ]
      : []),
  ];
}

function citeWriteRules(
  facts: AssessmentFacts,
  activeCount: number,
  service?: { label: string; requiredCount: number },
): Evidence[] {
  const named = facts.validationRules
    .slice(0, evidenceNameLimit)
    .map(
      (rule) =>
        `${rule.name} on ${rule.objectApiName}${rule.active ? "" : " (inactive)"}`,
    );

  return [
    cite(
      "list_validation_rules",
      `${facts.validationRules.length} write rules (${activeCount} active).`,
    ),
    ...named.map((item) => cite("list_validation_rules", `${item}.`)),
    ...(service
      ? [
          cite(
            "describe_object",
            `${service.label} has ${service.requiredCount} required fields.`,
          ),
        ]
      : []),
  ];
}

function describeAutomation(item: AssessmentFacts["automations"][number]) {
  const kind =
    item.kind === "apex_trigger" || item.kind === "apex"
      ? "Apex trigger"
      : "Flow";
  const on = item.objectApiName ? ` on ${item.objectApiName}` : "";
  const when = item.triggerType ? `, ${item.triggerType}` : "";
  return `${kind} ${item.name}${on}${when}`;
}

function cite(tool: Evidence["tool"], citation: string): Evidence {
  return { tool, citation };
}

function uniqueLabels(work: { label: string }[]) {
  return [...new Set(work.map((item) => item.label))].join(", ");
}

function humanizeName(value: string) {
  return value.replace(/__kav$/i, "").replace(/_/g, " ");
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
