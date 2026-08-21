import { visibleFields } from "@/modules/enterprise/fields";
import {
  articleContentState,
  articleSources,
  formatArticleCounts,
} from "@/modules/enterprise/knowledge-sources";
import type { Evidence } from "@/modules/intelligence/types";
import type { AssessmentFacts } from "@/modules/intelligence/types";
import {
  durableWorkFromFacts,
  isNoiseObject,
  listedCustomObjects,
  listedInventoryObjects,
  unusedStandardWork,
} from "@/modules/intelligence/work-objects";
import type { DurableWorkObject } from "@/modules/intelligence/work-objects";
import type {
  AccessInsight,
  AgentforceInsight,
  AutomationInsight,
  DataInsight,
  EnvironmentProfile,
  EvidenceRecord,
  IntelligenceFinding,
  IntelligenceGap,
  KnowledgeInsight,
  OrgIntelligence,
  OrgIntelligenceSummary,
  ProcessInsight,
  ProcessStep,
  WorkloadInsight,
  WorkObjectInsight,
} from "@/modules/intelligence/org-model";

export function buildOrgIntelligence(
  facts: AssessmentFacts,
  options?: {
    opportunityName?: string | null;
  },
): OrgIntelligence {
  const environment = environmentProfile(facts);
  const workload = workloadInsight(facts);
  const process = processInsight(facts);
  const data = dataInsight(facts);
  const knowledge = knowledgeInsight(facts);
  const automation = automationInsight(facts);
  const access = accessInsight(facts);
  const integration = integrationInsight(facts);
  const agentforce = agentforceInsight(facts);
  const platform = platformInsight(facts);
  const findings = [
    ...environmentFindings(environment),
    ...workloadFindings(facts, workload),
    ...processFindings(facts, process, workload),
    ...dataFindings(facts, data, workload),
    ...knowledgeFindings(facts, knowledge),
    ...automationFindings(facts, automation),
    ...accessFindings(facts, access),
    ...integrationFindings(integration),
    ...agentforceFindings(agentforce),
    ...platformFindings(facts, platform.constraints.length),
  ].map(withFindingTrace);

  const gaps = buildGaps(facts, {
    workload,
    process,
    data,
    knowledge,
    automation,
    access,
    integration,
    agentforce,
  });
  const evidence = collectEvidence(findings);

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
    agentforce,
    platform,
    findings,
    gaps,
    evidence,
    summary: summarizeOrg(findings, options?.opportunityName ?? null, {
      volumeAvailable: workload.volumeAvailable,
      qualityAvailable: data.qualityAvailable,
      integrationsAvailable: integration.available,
      agentforceAvailable: agentforce.available,
      primaryWorkLabel: workload.primary[0]?.label ?? null,
      gaps,
    }),
  };
}

export function attachOpportunityName(
  model: OrgIntelligence,
  opportunityName: string | null,
): OrgIntelligence {
  if (model.summary.strongestOpportunity === opportunityName) {
    return model;
  }

  return {
    ...model,
    summary: {
      ...model.summary,
      strongestOpportunity: opportunityName,
    },
  };
}

export function stampOrgIntelligenceRun(
  model: OrgIntelligence,
  runId: string,
): OrgIntelligence {
  if (model.runId === runId) {
    return model;
  }

  return { ...model, runId };
}

export function workFitPoolFromIntelligence(
  model: OrgIntelligence,
  facts: AssessmentFacts,
): DurableWorkObject[] {
  const ranked = durableWorkFromFacts(facts);
  const primary = new Set(model.workload.primary.map((item) => item.apiName));
  const context = new Set(model.workload.context.map((item) => item.apiName));

  return ranked.map((item) => ({
    ...item,
    role: primary.has(item.apiName)
      ? "primary"
      : context.has(item.apiName)
        ? "context"
        : "secondary",
  }));
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
    customObjectCount: listedCustomObjects(facts.objects).length || null,
    customObjectNames: listedCustomObjects(facts.objects)
      .slice(0, 20)
      .map((item) => `${item.label} (${item.apiName})`),
    inventoryObjectNames: listedInventoryObjects(facts.objects)
      .slice(0, 40)
      .map((item) => `${item.label} (${item.apiName})`),
    userPopulation: { value: null, basis: "unknown" },
    automationCount: facts.automations.length || null,
    activeAutomationCount:
      facts.automations.filter((item) => !item.status || /active/i.test(item.status))
        .length || null,
    profileCount: facts.security?.profileCount ?? null,
    permissionSetCount: facts.security?.permissionSetCount ?? null,
    knowledgePosture: !facts.knowledge
      ? "unknown"
      : articleContentState(facts.knowledge) === "published"
        ? "present"
        : articleContentState(facts.knowledge) === "unpublished"
          ? "unpublished"
          : articleContentState(facts.knowledge) === "empty"
            ? "absent"
            : "unknown",
    integrationPosture: !facts.integrations
      ? "unknown"
      : facts.integrations.endpoints.length > 0
        ? "present"
        : "absent",
    agentforcePosture: !facts.agentforce
      ? "unknown"
      : facts.agentforce.items.length > 0
        ? "present"
        : "absent",
  };
}

function toWorkInsight(
  item: {
    apiName: string;
    label: string;
    kind: WorkObjectInsight["kind"];
    role: WorkObjectInsight["role"];
    custom?: boolean;
    fieldCount?: number;
    customFieldCount?: number;
    requiredCount?: number;
    hasLifecycle?: boolean;
    usedInModel?: boolean;
  },
  facts: AssessmentFacts,
): WorkObjectInsight {
  const described = facts.describes[item.apiName];
  const fields = described ? visibleFields(described.fields) : [];
  return {
    apiName: item.apiName,
    label: item.label,
    kind: item.kind,
    role: item.role,
    custom: item.custom,
    fieldCount: item.fieldCount ?? fields.length,
    customFieldCount:
      item.customFieldCount ?? fields.filter((field) => field.custom).length,
    requiredCount:
      item.requiredCount ?? fields.filter((field) => field.required).length,
    hasLifecycle: item.hasLifecycle,
    usedInModel: item.usedInModel,
    recordTypes: (described?.recordTypes ?? [])
      .filter((recordType) => recordType.active)
      .map((recordType) => recordType.label),
    relatedObjects: fields.flatMap((field) => field.referenceTo ?? []),
    relatedActivity: ["Task", "EmailMessage"].filter((apiName) =>
      fields.some((field) => (field.referenceTo ?? []).includes(apiName)),
    ),
    volume: { value: null, basis: "unknown", status: "unknown" },
  };
}

function workloadInsight(facts: AssessmentFacts): WorkloadInsight {
  const durable = durableWorkFromFacts(facts);
  const present = new Map(facts.objects.map((item) => [item.apiName, item]));
  const named = new Set(durable.map((item) => item.apiName));

  const supporting = ["Task", "EmailMessage"]
    .map((apiName) => present.get(apiName) ?? (facts.describes[apiName]
      ? { apiName, label: facts.describes[apiName].label, custom: false, queryable: true }
      : null))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !named.has(item.apiName))
    .map((item) =>
      toWorkInsight(
        {
          apiName: item.apiName,
          label: item.label,
          kind: "supporting",
          role: "secondary",
          custom: item.custom,
        },
        facts,
      ),
    );

  return {
    primary: durable
      .filter((item) => item.role === "primary")
      .map((item) => toWorkInsight(item, facts)),
    secondary: [
      ...durable
        .filter((item) => item.role === "secondary")
        .map((item) => toWorkInsight(item, facts)),
      ...supporting,
    ],
    context: durable
      .filter((item) => item.role === "context")
      .map((item) => toWorkInsight(item, facts)),
    volumeAvailable: false,
    volumeGap:
      "Record volume, open backlog, and recent activity are not available. Discovery is metadata-only. An allowlisted aggregate-count tool would be required to observe workload size.",
  };
}

function processInsight(facts: AssessmentFacts): ProcessInsight {
  const operating = new Set(durableWorkFromFacts(facts).map((item) => item.apiName));
  const observedPaths = Object.values(facts.describes).flatMap((described) => {
    if (!operating.has(described.apiName)) {
      return [];
    }
    const statuses = described.fields
      .filter((field) => /^(status|stagename)$/i.test(field.apiName))
      .flatMap((field) => field.picklistLabels ?? []);
    if (!statuses.length) {
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

  const inferredPaths = observedPaths.map((path) => ({
    objectLabel: path.objectLabel,
    stages: path.stages,
    provenance: "inferred" as const,
    confidence: "medium" as const,
  }));

  const assignment = (facts.process?.assignmentRules ?? [])
    .filter((rule) => rule.active)
    .map((rule) => `${rule.name} on ${rule.objectApiName}`);
  const escalation = (facts.process?.escalationRules ?? [])
    .filter((rule) => rule.active)
    .map((rule) => `${rule.name} on ${rule.objectApiName}`);
  const approvals = (facts.process?.approvalProcesses ?? [])
    .filter((rule) => rule.active)
    .map((rule) => `${rule.name} on ${rule.objectApiName}`);

  return {
    observedPaths,
    inferredPaths,
    assignment,
    hours: (facts.process?.businessHours ?? [])
      .filter((item) => item.active)
      .map((item) => item.name),
    path: processPath(facts, observedPaths, assignment, escalation),
    escalation,
    approvals,
  };
}

function processPath(
  facts: AssessmentFacts,
  observedPaths: { objectLabel: string; stages: string[] }[],
  assignment: string[],
  escalation: string[],
): ProcessStep[] {
  const primary = durableWorkFromFacts(facts).find((item) => item.role === "primary");
  const stages =
    observedPaths.find((path) => path.objectLabel === primary?.label)?.stages ??
    observedPaths[0]?.stages ??
    [];
  const queues = (facts.process?.queues ?? []).filter(
    (item) => !primary || !item.objectApiName || item.objectApiName === primary.apiName,
  );
  const activity = ["Task", "EmailMessage"].filter(
    (apiName) =>
      facts.objects.some((item) => item.apiName === apiName) ||
      Boolean(facts.describes[apiName]),
  );
  const closed = stages.filter((stage) =>
    /closed|resolved|approved|complete|done/i.test(stage),
  );
  const steps: ProcessStep[] = [];
  if (primary) {
    steps.push({
      stage: "entry",
      label: `${primary.label} created`,
      provenance: "inferred",
    });
    steps.push({
      stage: "work",
      label: stages.length
        ? `${primary.label} statuses ${stages.join(", ")}`
        : `${primary.label} is the work record`,
      provenance: stages.length ? "observed" : "inferred",
    });
  }
  if (assignment.length > 0 || queues.length > 0) {
    steps.push({
      stage: "assignment",
      label:
        assignment[0] ??
        `Queues: ${queues.map((item) => item.name).slice(0, 4).join(", ")}`,
      provenance: "observed",
    });
  }
  if (activity.length > 0) {
    steps.push({
      stage: "activity",
      label: `${activity.join(" and ")} can attach to the work`,
      provenance: "observed",
    });
  }
  if (escalation.length > 0) {
    steps.push({
      stage: "escalation",
      label: escalation[0],
      provenance: "observed",
    });
  }
  if (closed.length > 0) {
    steps.push({
      stage: "resolution",
      label: `Close values: ${closed.join(", ")}`,
      provenance: "observed",
    });
  }
  return steps;
}

function dataInsight(facts: AssessmentFacts): DataInsight {
  const objects = Object.values(facts.describes).map((described) => {
    const fields = visibleFields(described.fields);
    return {
      label: described.label,
      fieldCount: fields.length,
      requiredCount: fields.filter((field) => field.required).length,
      formulaCount: fields.filter((field) => field.formula).length,
      uniqueCount: fields.filter((field) => field.unique).length,
      externalIdCount: fields.filter((field) => field.externalId).length,
      relationshipCount: fields.filter(
        (field) =>
          field.relationshipKind === "lookup" ||
          field.relationshipKind === "master_detail",
      ).length,
      qualityAvailable: false,
      apiName: described.apiName,
      writableCount: fields.filter((field) => !field.readOnly && !field.formula).length,
      readOnlyCount: fields.filter((field) => field.readOnly || field.formula).length,
      picklistCount: fields.filter((field) => (field.picklistLabels?.length ?? 0) > 0).length,
    };
  });
  const labels = new Map(
    Object.values(facts.describes).flatMap((described) => [
      [described.apiName, described.label],
      ...facts.objects
        .filter((item) => item.apiName === described.apiName)
        .map((item): [string, string] => [item.apiName, item.label]),
    ]),
  );
  const relationships = Object.values(facts.describes).flatMap((described) =>
    described.fields.flatMap((field) => {
      const kind = field.relationshipKind;
      if (kind !== "lookup" && kind !== "master_detail") {
        return [];
      }
      return (field.referenceTo ?? []).map((target) => ({
        fromLabel: described.label,
        toLabel: labels.get(target) ?? humanize(target),
        kind,
      }));
    }),
  );

  return {
    objects,
    relationships,
    qualityAvailable: false,
    qualityGap:
      "Null rates, completeness, and duplicate indicators were not read. Metadata requiredness is observed; data quality statistics require an allowlisted aggregate that does not return CRM rows.",
  };
}

function knowledgeInsight(facts: AssessmentFacts): KnowledgeInsight {
  const sources = articleSources(facts.knowledge?.articleObjects);
  const articles = facts.knowledge?.articles;
  const state = articleContentState(facts.knowledge ?? {});
  const articleCountsKnown = state !== "unknown";
  return {
    enabled: state === "published",
    sources: sources.map(humanize),
    categories: facts.knowledge?.dataCategories ?? [],
    coverageKnown: false,
    freshnessKnown: false,
    usefulnessKnown: Boolean(facts.knowledge?.usefulnessKnown),
    articleCountsKnown,
    draftCount: articles?.draft ?? null,
    publishedCount: articles?.published ?? null,
    archivedCount: articles?.archived ?? null,
  };
}

function automationInsight(facts: AssessmentFacts): AutomationInsight {
  const active = facts.automations.filter(
    (item) => !item.status || /active/i.test(item.status),
  );
  const objectsTouched = [
    ...new Set(
      active
        .map((item) => item.objectLabel ?? item.objectApiName)
        .filter((item): item is string => Boolean(item)),
    ),
  ];
  return {
    total: facts.automations.length,
    active: active.length,
    named: active.slice(0, 8).map((item) => item.name),
    objectsTouched,
    map: active.slice(0, 20).map((item) => ({
      objectLabel: item.objectLabel ?? item.objectApiName ?? "Unscoped",
      objectApiName: item.objectApiName ?? null,
      name: item.name,
      kind: item.kind,
      trigger: item.triggerType ?? null,
      actions: item.actions ?? [],
      fieldsAffected: item.fieldsAffected ?? [],
    })),
    actionsKnown: active.some((item) => (item.actions ?? []).length > 0),
  };
}

function accessInsight(facts: AssessmentFacts): AccessInsight {
  const profileCount = facts.security?.profileCount ?? null;
  const permissionSetCount = facts.security?.permissionSetCount ?? null;
  const total = (profileCount ?? 0) + (permissionSetCount ?? 0);
  const sharing = (facts.security?.sharing ?? [])
    .slice(0, 8)
    .map((item) => ({
      objectLabel: humanize(item.objectApiName),
      internal: item.internal,
    }));
  return {
    profileCount,
    permissionSetCount,
    permissionSetGroupCount: facts.security?.permissionSetGroupCount ?? null,
    roleCount: facts.security?.roleCount ?? null,
    namedProfiles: (facts.security?.profileNames ?? []).slice(0, 8),
    isolation:
      facts.security == null
        ? "unknown"
        : total > 80
          ? "sprawling"
          : "focused",
    sharing,
    objectAccessAvailable: Boolean(facts.security?.objectAccessAvailable),
    fieldAccessAvailable: Boolean(facts.security?.fieldAccessAvailable),
  };
}

function integrationInsight(facts: AssessmentFacts): OrgIntelligence["integration"] {
  if (!facts.integrations) {
    return {
      observed: [],
      available: false,
      gap: "Named credentials, connected apps, remote sites, external objects, and platform events were not read.",
    };
  }
  const observed = facts.integrations.endpoints.map((item) =>
    item.host ? `${item.name} (${item.host})` : item.name,
  );
  return {
    observed,
    available: true,
    gap: observed.length === 0 ? "No external endpoints were named on this run." : null,
  };
}

function agentforceInsight(facts: AssessmentFacts): AgentforceInsight {
  if (!facts.agentforce) {
    return { available: false, existing: [], netNew: null };
  }
  const existing = facts.agentforce.items.map((item) => item.name);
  return {
    available: true,
    existing,
    netNew: existing.length === 0,
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
  const packages = (facts.limits?.packages ?? []).map((item) => item.name);
  return { constraints, packages };
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
  const unused = unusedStandardWork(facts);
  const volume = finding({
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
  });

  if (!primary) {
    return [
      unused.length > 0 ? unusedStandardFinding(unused) : missingWorkFinding(facts),
      volume,
    ];
  }

  const described = facts.describes[primary.apiName];
  const fields = described ? visibleFields(described.fields) : [];
  const customFields = fields.filter((field) => field.custom).length;
  const secondary = [...workload.secondary, ...workload.context]
    .map((item) => item.label)
    .slice(0, 6);
  return [
    finding({
      id: "work-primary",
      domain: "workload",
      title: `${primary.label} is the primary durable work object`,
      summary: `${primary.label} appears to be the durable record around which operational work is organized${
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
              customFields > 0
                ? `${primary.label} has ${fields.length} fields (${customFields} custom, ${fields.filter((field) => field.required).length} required).`
                : `${primary.label} has ${fields.length} fields (${fields.filter((field) => field.required).length} required).`,
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
    ...(unused.length > 0 ? [unusedStandardFinding(unused)] : []),
    volume,
  ];
}

function missingWorkFinding(facts: AssessmentFacts) {
  return finding({
    id: "work-missing",
    domain: "workload",
    title: "No durable work object was found",
    summary: customWorkSummary(facts),
    evidence: cite("list_objects", "No durable work objects were found."),
    provenance: "observed",
    confidence: "high",
    businessImplication: "An agent has no durable record to sit on.",
    consumptionImplication: "A consumption forecast would invent the work object first.",
    nextAction: "Confirm where operational work lives, including queryable custom objects.",
    relatedSignals: ["addressable_work"],
  });
}

function unusedStandardFinding(unused: { apiName: string; label: string }[]) {
  const labels = unused.map((item) => item.label);
  return finding({
    id: "work-unused-standard",
    domain: "workload",
    title:
      labels.length === 1
        ? `${labels[0]} is present but not shown as operating work`
        : `${joinAnd(labels)} are present but not shown as operating work`,
    summary:
      "These standard objects appear in the org catalog. Metadata does not show custom fields, record types, automations, validation rules, or assignment rules that would place them in the operating data model.",
    evidence: cite(
      "list_objects",
      `${labels.join(", ")} present. No metadata evidence of use on those objects.`,
    ),
    provenance: "inferred",
    confidence: "high",
    businessImplication: "Catalog presence is not the same as the data model in use.",
    nextAction: "Confirm whether work actually runs on these objects or on custom objects.",
    relatedSignals: ["addressable_work"],
  });
}

function processFindings(
  facts: AssessmentFacts,
  process: ProcessInsight,
  workload: WorkloadInsight,
): IntelligenceFinding[] {
  const primaryLabel = workload.primary[0]?.label;
  const path =
    process.observedPaths.find((item) => item.objectLabel === primaryLabel) ??
    process.observedPaths[0];
  if (!path) {
    return [
      finding({
        id: "process-missing",
        domain: "process",
        title: "No observed work lifecycle",
        summary: "Statuses on a durable work object were not read.",
        evidence: cite("describe_object", "No work or revenue path statuses were stored."),
        provenance: "unknown",
        confidence: "low",
        businessImplication: "An operating path cannot be claimed from object presence alone.",
        nextAction: "Describe the durable work object and re-run intelligence.",
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
      title: `${path.objectLabel} has an observed work lifecycle`,
      summary: `Observed ${path.objectLabel} statuses: ${joinAnd(path.stages)}.${assignment}${
        process.path.length
          ? ` Reconstructed path: ${process.path.map((step) => step.label).join(" → ")}.`
          : ""
      } That suggests a recognizable work path. The handoff itself was not observed as a documented process.`,
      evidence: cite(
        "describe_object",
        `${path.objectLabel} statuses: ${path.stages.join(", ")}.`,
      ),
      provenance: "inferred",
      confidence: "medium",
      businessImplication: "Conversations can be counted against a known start and close, not unbounded chat.",
      consumptionImplication: "A topic can sit on this path once one handoff is named.",
      nextAction: "Map the human handoff on this path before automating it.",
      relatedSignals: ["operating_path"],
    }),
    ...(process.assignment.length === 0
      ? [
          finding({
            id: "process-assignment-unknown",
            domain: "process",
            title: "Assignment and handoff behavior were not observed",
            summary:
              "A status or stage path exists, but queues, assignment rules, and human handoff were not fully observed. That is not evidence they are absent.",
            evidence: cite(
              "list_process_controls",
              "No assignment rules were named on the observed work path.",
            ),
            provenance: "unknown",
            confidence: "low",
            businessImplication:
              "An agent cannot be assumed to own routing. Handoff remains a validation item.",
            nextAction: "Confirm how work is assigned and escalated before designing agent routing.",
            relatedSignals: ["operating_path"],
          }),
        ]
      : []),
  ];
}

function dataFindings(
  facts: AssessmentFacts,
  data: DataInsight,
  workload: WorkloadInsight,
): IntelligenceFinding[] {
  const primaryLabel = workload.primary[0]?.label;
  const target = primaryLabel
    ? data.objects.find((item) => item.label === primaryLabel)
    : undefined;
  if (!target) {
    return [
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

  return [
    finding({
      id: "data-requiredness",
      domain: "data",
      title: `${target.label} has a configurable field surface with limited requiredness`,
      summary: `${target.label} has ${target.fieldCount} fields, ${target.requiredCount} required. Completeness, null rates, and duplicates were not observed.`,
      evidence: cite(
        "describe_object",
        `${target.label} has ${target.fieldCount} fields (${target.requiredCount} required).`,
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
  if (!facts.knowledge && facts.observed?.knowledge !== true) {
    return [
      finding({
        id: "knowledge-unknown",
        domain: "knowledge",
        title: "Article content was not observed",
        summary:
          "Draft, published, and archived articles were not read on this run. That is unknown, not evidence that content is absent.",
        evidence: cite("knowledge_posture", "Article content was not observed."),
        provenance: "unknown",
        confidence: "high",
        businessImplication: "Grounded answers cannot be judged until article content is counted.",
        nextAction: "Re-run intelligence to count draft, published, and archived articles.",
        relatedSignals: ["grounded_answers"],
      }),
    ];
  }

  const counts = {
    draft: knowledge.draftCount ?? 0,
    published: knowledge.publishedCount ?? 0,
    archived: knowledge.archivedCount ?? 0,
  };
  const state = articleContentState({
    articleCountsKnown: knowledge.articleCountsKnown,
    articles: knowledge.articleCountsKnown ? counts : null,
  });
  const countEvidence = cite("knowledge_posture", formatArticleCounts(counts));

  if (state === "unknown") {
    return [
      finding({
        id: "knowledge-content-unknown",
        domain: "knowledge",
        title: "Article content was not observed",
        summary:
          "Draft, published, and archived articles were not counted.",
        evidence: cite("knowledge_posture", "Article content was not observed."),
        provenance: "unknown",
        confidence: "high",
        businessImplication: "Grounded answers cannot be judged until article content is counted.",
        nextAction: "Re-run intelligence to count draft, published, and archived articles.",
        relatedSignals: ["grounded_answers"],
      }),
    ];
  }

  if (state === "empty") {
    return [
      finding({
        id: "knowledge-empty",
        domain: "knowledge",
        title: "No knowledge articles were found",
        summary:
          "No draft, published, or archived articles were found. An agent would invent answers or look outside the org.",
        evidence: countEvidence,
        provenance: "observed",
        confidence: "high",
        businessImplication: "There is no knowledge content to retrieve.",
        nextAction: "Publish the articles an agent would need before a customer-facing Q&A topic.",
        relatedSignals: ["grounded_answers"],
      }),
    ];
  }

  if (state === "unpublished") {
    return [
      finding({
        id: "knowledge-unpublished",
        domain: "knowledge",
        title: "No published articles were found",
        summary: `${formatArticleCounts(counts)} Published content is what an agent can retrieve. Draft and archived articles are not a live knowledge base.`,
        evidence: countEvidence,
        provenance: "observed",
        confidence: "high",
        businessImplication: "Grounded answers are not supported until articles are published.",
        nextAction: "Publish the articles that should ground answers, then re-run intelligence.",
        relatedSignals: ["grounded_answers"],
      }),
    ];
  }

  return [
    finding({
      id: "knowledge-present",
      domain: "knowledge",
      title: "Published articles are present",
      summary: `${formatArticleCounts(counts)} An agent could retrieve those published answers. Counts are not coverage or freshness.`,
      evidence: countEvidence,
      provenance: "observed",
      confidence: "high",
      businessImplication:
        "Published knowledge content exists. Grounded answers still require a topic those articles actually cover.",
      nextAction:
        "Validate whether the published articles can answer one high-volume question before treating retrieval as ready.",
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
          automation.map.length
            ? automation.map
                .slice(0, 8)
                .map(
                  (item) =>
                    `${item.objectLabel}: ${item.kind} ${item.name}${
                      item.trigger ? ` (${item.trigger})` : ""
                    }`,
                )
                .join("; ")
            : `${automation.total} automations (${automation.active} active).`,
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
        automation.map.length
          ? automation.map
              .slice(0, 8)
              .map(
                (item) =>
                  `${item.objectLabel}: ${item.kind} ${item.name}${
                    item.trigger ? ` (${item.trigger})` : ""
                  }`,
              )
              .join("; ")
          : `${automation.total} automations (${automation.active} active).`,
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
      summary: `${access.profileCount} profiles, ${access.permissionSetCount ?? 0} permission sets${
        access.permissionSetGroupCount != null
          ? `, ${access.permissionSetGroupCount} permission set groups`
          : ""
      }${access.roleCount != null ? `, ${access.roleCount} roles` : ""} were read. ${
        access.isolation === "sprawling"
          ? "A dedicated agent identity is preferable to inheriting a human user's access."
          : "The surface looks focused enough to scope an agent permission set."
      } ${
        access.sharing.length
          ? `Default sharing was read for ${joinAnd(access.sharing.map((item) => item.objectLabel))}. `
          : ""
      }Object- and field-level access for an agent was not mapped.`,
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

function integrationFindings(
  integration: OrgIntelligence["integration"],
): IntelligenceFinding[] {
  if (!integration.available) {
    return [
      finding({
        id: "integration-unknown",
        domain: "integration",
        title: "External-system integrations were not observed",
        summary: integration.gap ?? "Integration inventory was not read.",
        evidence: cite("get_integration_map", "Integration inventory was not stored."),
        provenance: "unknown",
        confidence: "high",
        businessImplication: "A process that leaves this org cannot be judged from this run.",
        nextAction: "Re-run intelligence to read named credentials, connected apps, and remote sites.",
        relatedSignals: [],
      }),
    ];
  }

  if (integration.observed.length === 0) {
    return [
      finding({
        id: "integration-none",
        domain: "integration",
        title: "No external endpoints were named",
        summary: "Named credentials, connected apps, remote sites, external objects, and platform events were read. None were returned.",
        evidence: cite("get_integration_map", "No external endpoints were named."),
        provenance: "observed",
        confidence: "medium",
        businessImplication: "The work path does not show an outbound system from metadata.",
        nextAction: "Confirm with the customer whether resolution still depends on systems not named here.",
        relatedSignals: [],
      }),
    ];
  }

  return [
    finding({
      id: "integration-present",
      domain: "integration",
      title: "This org has named connections outside the platform",
      summary: `Observed: ${joinAnd(integration.observed.slice(0, 8))}. An agent may need those systems for complete work.`,
      evidence: cite(
        "get_integration_map",
        `External endpoints: ${integration.observed.slice(0, 8).join(", ")}.`,
      ),
      provenance: "observed",
      confidence: "high",
      businessImplication: "Do not treat the opportunity as self-contained inside this org.",
      nextAction: "Name which work path depends on these connections before forecasting autonomous resolution.",
      relatedSignals: [],
    }),
  ];
}

function agentforceFindings(agentforce: AgentforceInsight): IntelligenceFinding[] {
  if (!agentforce.available) {
    return [
      finding({
        id: "agentforce-unknown",
        domain: "agentforce",
        title: "Existing AI configuration was not observed",
        summary: "Agents, topics, actions, and prompt templates were not read.",
        evidence: cite(
          "get_agentforce_configuration",
          "Agentforce configuration was not stored.",
        ),
        provenance: "unknown",
        confidence: "high",
        businessImplication: "Net-new versus expand cannot be judged from this run.",
        nextAction: "Re-run intelligence to read existing agent configuration.",
        relatedSignals: [],
      }),
    ];
  }

  if (agentforce.existing.length === 0) {
    return [
      finding({
        id: "agentforce-none",
        domain: "agentforce",
        title: "No existing agent configuration was found",
        summary: "Agents, prompt templates, and AI actions were read. None were returned.",
        evidence: cite("get_agentforce_configuration", "No existing agents or prompt templates were found."),
        provenance: "observed",
        confidence: "medium",
        businessImplication: "The first agent opportunity would be net-new on this org.",
        nextAction: "Design the first topic against the durable work object, not against an existing agent.",
        relatedSignals: [],
      }),
    ];
  }

  return [
    finding({
      id: "agentforce-present",
      domain: "agentforce",
      title: "AI capability already exists in this org",
      summary: `Observed: ${joinAnd(agentforce.existing.slice(0, 8))}. The opportunity may expand what is already there.`,
      evidence: cite(
        "get_agentforce_configuration",
        `Existing AI: ${agentforce.existing.slice(0, 8).join(", ")}.`,
      ),
      provenance: "observed",
      confidence: "high",
      businessImplication: "Do not propose the first agent as if none exists.",
      nextAction: "Compare the recommended topic to the existing agents before opening a Business Case.",
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
  agentforceAvailable?: boolean;
}) {
  return [
    !input.volumeAvailable ? "Workload volume was not observed" : null,
    !input.qualityAvailable ? "Data quality statistics were not observed" : null,
    !input.integrationsAvailable
      ? "External-system integrations were not observed"
      : null,
    input.agentforceAvailable === false
      ? "Existing AI configuration was not observed"
      : null,
  ].filter((item): item is string => Boolean(item));
}

function withFindingTrace(item: IntelligenceFinding): IntelligenceFinding {
  const evidence = item.evidence.map((entry, index) => ({
    ...entry,
    id: entry.id ?? `${item.id}-ev-${index + 1}`,
  }));
  return {
    ...item,
    evidence,
    evidenceIds: evidence.map((entry) => entry.id).filter((id): id is string => Boolean(id)),
    observation: item.observation ?? item.summary,
    implication: item.implication ?? item.businessImplication,
    status:
      item.status ??
      (item.provenance === "unknown"
        ? "unknown"
        : item.provenance === "observed"
          ? "observed"
          : "inferred"),
  };
}

function collectEvidence(findings: IntelligenceFinding[]): EvidenceRecord[] {
  return findings.flatMap((item) =>
    item.evidence.flatMap((entry) =>
      entry.id ? [{ id: entry.id, tool: entry.tool, citation: entry.citation }] : [],
    ),
  );
}

function buildGaps(
  facts: AssessmentFacts,
  model: {
    workload: WorkloadInsight;
    process: ProcessInsight;
    data: DataInsight;
    knowledge: KnowledgeInsight;
    automation: AutomationInsight;
    access: AccessInsight;
    integration: OrgIntelligence["integration"];
    agentforce: AgentforceInsight;
  },
): IntelligenceGap[] {
  const gaps: IntelligenceGap[] = [];
  if (!model.workload.volumeAvailable) {
    gaps.push({
      id: "gap-volume",
      domain: "workload",
      title: "Workload volume was not observed",
      description: model.workload.volumeGap ?? "Record counts were not read.",
      impact: "high",
      evidenceNeeded: "An allowlisted aggregate-count tool, or a customer-provided annual volume.",
      relatedSignals: ["addressable_work"],
    });
  }
  if (!model.data.qualityAvailable) {
    gaps.push({
      id: "gap-quality",
      domain: "data",
      title: "Data quality statistics were not observed",
      description: model.data.qualityGap ?? "Completeness was not measured.",
      impact: "high",
      evidenceNeeded: "An allowlisted aggregate that does not return CRM rows, or a sampled review.",
      relatedSignals: ["writeback_control"],
    });
  }
  if (model.process.assignment.length === 0) {
    gaps.push({
      id: "gap-handoff",
      domain: "process",
      title: "Human handoff and assignment were not fully observed",
      description:
        "Status values may exist, but assignment, queues, and handoff behavior were not observed as a complete process.",
      impact: "medium",
      evidenceNeeded: "Assignment rules, queues, or a named human handoff on the primary path.",
      relatedSignals: ["operating_path"],
    });
  }
  if (!model.knowledge.articleCountsKnown) {
    gaps.push({
      id: "gap-knowledge-fitness",
      domain: "knowledge",
      title: "Article content was not observed",
      description:
        "Draft, published, and archived articles were not counted.",
      impact: "medium",
      evidenceNeeded: "An allowlisted count of draft, published, and archived articles, without article bodies.",
      relatedSignals: ["grounded_answers"],
    });
  } else if ((model.knowledge.publishedCount ?? 0) === 0) {
    gaps.push({
      id: "gap-knowledge-fitness",
      domain: "knowledge",
      title: "No published articles were found",
      description:
        "Grounded answers need published content. Draft and archived articles are not live retrieval content.",
      impact: "high",
      evidenceNeeded: "Published articles an agent could retrieve for one high-volume question.",
      relatedSignals: ["grounded_answers"],
    });
  } else if (
    model.knowledge.enabled &&
    (!model.knowledge.coverageKnown || !model.knowledge.freshnessKnown)
  ) {
    gaps.push({
      id: "gap-knowledge-fitness",
      domain: "knowledge",
      title: "Knowledge coverage and freshness were not observed",
      description:
        "A source may exist. Coverage, freshness, and retrieval fitness were not measured.",
      impact: "medium",
      evidenceNeeded: "Article counts, categories, or retrieval configuration for one topic.",
      relatedSignals: ["grounded_answers"],
    });
  }
  if (facts.observed?.automations === false) {
    gaps.push({
      id: "gap-automation",
      domain: "automation",
      title: "Automation inventory was not observed",
      description: "Active automation was not read on this run. That is unknown, not evidence of none.",
      impact: "medium",
      evidenceNeeded: "A successful list_automations result.",
      relatedSignals: ["automation_collision", "writeback_control"],
    });
  }
  if (!model.access.objectAccessAvailable || !model.access.fieldAccessAvailable) {
    gaps.push({
      id: "gap-agent-access",
      domain: "access",
      title: "Object- and field-level access for an agent identity was not mapped",
      description:
        "Profile and permission-set counts are not an agent permission model.",
      impact: "high",
      evidenceNeeded: "Object and field access for a dedicated agent identity.",
      relatedSignals: ["access_surface"],
    });
  }
  if (!model.integration.available) {
    gaps.push({
      id: "gap-integrations",
      domain: "integration",
      title: "External-system integrations were not observed",
      description: model.integration.gap ?? "Integration inventory was not read.",
      impact: "medium",
      evidenceNeeded: "Named credentials, connected apps, remote sites, or external objects.",
    });
  }
  if (model.agentforce.available === false) {
    gaps.push({
      id: "gap-agentforce",
      domain: "agentforce",
      title: "Existing AI configuration was not observed",
      description: "Agents, topics, and prompt templates were not read.",
      impact: "medium",
      evidenceNeeded: "A successful get_agentforce_configuration result.",
    });
  }
  return gaps;
}

function summarizeOrg(
  findings: IntelligenceFinding[],
  opportunityName: string | null,
  availability: {
    volumeAvailable: boolean;
    qualityAvailable: boolean;
    integrationsAvailable: boolean;
    agentforceAvailable: boolean;
    primaryWorkLabel: string | null;
    gaps?: IntelligenceGap[];
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
          item.id === "knowledge-empty" ||
          item.id === "knowledge-unpublished" ||
          item.id === "knowledge-present",
      )
      .map((item) => item.title),
  ].slice(0, 6);
  const hasWork = Boolean(availability.primaryWorkLabel);
  const writeThin = findings.some((item) => item.id === "data-requiredness");
  const accessBroad = findings.some((item) => /broad/.test(item.title));

  return {
    learned,
    notObserved,
    meaning: hasWork
      ? `The environment appears suitable for a focused agent opportunity on ${availability.primaryWorkLabel}${
          writeThin || accessBroad
            ? ", but production should begin with narrow access and controlled write-back"
            : ""
        }.`
      : "The environment does not yet show a durable work object an agent can sit on.",
    constraints: constraints.length
      ? constraints
      : ["Nothing on this run is a named constraint yet."],
    strongestOpportunity: opportunityName,
    nextStep: hasWork
      ? "Validate the work lifecycle, knowledge coverage for one topic, and agent write boundaries before deployment design."
      : "Confirm where operational work lives before opening a Business Case.",
  };
}

function customWorkSummary(facts: AssessmentFacts) {
  const customCount = facts.objects.filter(
    (item) => item.custom && item.queryable && !isNoiseObject(item.apiName),
  ).length;
  if (customCount > 0) {
    return `The run did not identify a durable work object. ${customCount} queryable custom objects were present and considered.`;
  }
  return "The run did not find a queryable durable work object, including custom objects.";
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

export function namedCustomObjects(model: OrgIntelligence) {
  return uniqueStrings([
    ...(model.environment.customObjectNames ?? []),
    ...workCustomNames(model),
  ]);
}

export function hydrateOrgIntelligence(
  model: OrgIntelligence,
  facts: AssessmentFacts | null,
): OrgIntelligence {
  const fromFacts = facts
    ? listedCustomObjects(facts.objects).map(
        (item) => `${item.label} (${item.apiName})`,
      )
    : [];
  const customObjectNames = uniqueStrings([
    ...(model.environment.customObjectNames ?? []),
    ...fromFacts,
    ...workCustomNames(model),
  ]);
  const inventoryObjectNames = uniqueStrings([
    ...(model.environment.inventoryObjectNames ?? []),
    ...(facts
      ? listedInventoryObjects(facts.objects).map(
          (item) => `${item.label} (${item.apiName})`,
        )
      : []),
    ...customObjectNames,
  ]).slice(0, 40);

  return {
    ...model,
    environment: {
      ...model.environment,
      customObjectNames,
      inventoryObjectNames,
      customObjectCount:
        customObjectNames.length ||
        (facts ? listedCustomObjects(facts.objects).length : 0) ||
        model.environment.customObjectCount,
    },
    knowledge: {
      ...model.knowledge,
      articleCountsKnown: model.knowledge.articleCountsKnown ?? false,
      draftCount: model.knowledge.draftCount ?? null,
      publishedCount: model.knowledge.publishedCount ?? null,
      archivedCount: model.knowledge.archivedCount ?? null,
    },
  };
}

function workCustomNames(model: OrgIntelligence) {
  return [
    ...model.workload.primary,
    ...model.workload.secondary,
    ...model.workload.context,
  ]
    .filter((item) => /__c$/i.test(item.apiName))
    .map((item) => `${item.label} (${item.apiName})`);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function formatOrgIntelligenceBrief(model: OrgIntelligence) {
  const notObserved = notObservedFromModel(model);
  const customNames = namedCustomObjects(model);
  const customCount =
    customNames.length || model.environment.customObjectCount || 0;
  const findings = model.findings
    .map(
      (item) =>
        `${item.title} [${item.provenance}/${item.confidence}]. ${item.summary}`,
    )
    .join("\n");
  return [
    `Organization intelligence. ${model.environment.orgName ?? "Connected environment"}.`,
    (model.environment.inventoryObjectNames ?? []).length
      ? `Objects named on this run. ${model.environment.inventoryObjectNames.join(", ")}.`
      : "Objects named on this run were not stored on this brief.",
    customNames.length
      ? `Custom objects named on this run. ${customCount}. ${customNames.join(", ")}.`
      : customCount
        ? `Custom objects counted on this run. ${customCount}. Names were not stored on this brief.`
        : "Custom objects named on this run. Names were not stored on this brief. That is not evidence the org has zero custom objects.",
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
    model.gaps?.length
      ? `Intelligence gaps.\n${model.gaps
          .map((item) => `${item.title} [${item.impact}]. ${item.description}`)
          .join("\n")}`
      : "",
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
    agentforceAvailable: model.agentforce?.available,
  });
}
