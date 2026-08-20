import { visibleFields } from "@/modules/enterprise/fields";
import type { EnterpriseObject, ObjectDescribe } from "@/modules/enterprise/types";
import type { AssessmentFacts, WorkKind } from "@/modules/intelligence/types";

export const describeObjectLimit = 16;

const platformNoise =
  /__(Share|History|Feed|Tag|ChangeEvent|hd|x|b|e|mdt)$|(Share|History|Feed|ChangeEvent)$/i;

export type WorkUsage = {
  customFields: number;
  customRecordTypes: number;
  automations: number;
  validationRules: number;
  assignmentRules: number;
};

export type DurableWorkObject = {
  apiName: string;
  label: string;
  kind: WorkKind;
  custom: boolean;
  fieldCount: number;
  requiredCount: number;
  customFieldCount: number;
  hasLifecycle: boolean;
  usedInModel: boolean;
  score: number;
  role: "primary" | "secondary" | "context";
};

export function isNoiseObject(apiName: string) {
  return platformNoise.test(apiName);
}

export function isInventoryObject(object: EnterpriseObject) {
  if (!object.queryable || isNoiseObject(object.apiName) || object.customSetting) {
    return false;
  }
  if (object.custom) {
    return true;
  }
  return object.layoutable !== false;
}

export function intentText(input: {
  projectType?: string;
  objective?: string;
  outcomes?: string[];
}) {
  return [input.projectType, input.objective, ...(input.outcomes ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function workUsage(apiName: string, facts: AssessmentFacts): WorkUsage {
  const described = facts.describes[apiName];
  const label = facts.objects.find((item) => item.apiName === apiName)?.label;
  const processRules = [
    ...(facts.process?.assignmentRules ?? []),
    ...(facts.process?.escalationRules ?? []),
    ...(facts.process?.autoResponseRules ?? []),
    ...(facts.process?.approvalProcesses ?? []),
  ];
  return {
    customFields: described?.fields.filter((field) => field.custom).length ?? 0,
    customRecordTypes:
      described?.recordTypes.filter(
        (recordType) =>
          recordType.active && !/^master$/i.test(recordType.developerName),
      ).length ?? 0,
    automations: facts.automations.filter(
      (item) =>
        automationTouches(apiName, item.name, item.objectApiName) ||
        (label != null && item.objectLabel === label),
    ).length,
    validationRules: facts.validationRules.filter(
      (rule) => rule.objectApiName === apiName && rule.active,
    ).length,
    assignmentRules: processRules.filter(
      (rule) => rule.objectApiName === apiName && rule.active,
    ).length,
  };
}

export function hasUsageEvidence(usage: WorkUsage) {
  return (
    usage.customFields > 0 ||
    usage.customRecordTypes > 0 ||
    usage.automations > 0 ||
    usage.validationRules > 0 ||
    usage.assignmentRules > 0
  );
}

export function objectUsedInModel(
  object: Pick<EnterpriseObject, "apiName" | "custom">,
  facts: AssessmentFacts,
) {
  if (object.custom) {
    return true;
  }
  return hasUsageEvidence(workUsage(object.apiName, facts));
}

export function unusedStandardWork(facts: AssessmentFacts): EnterpriseObject[] {
  return facts.objects.filter(
    (item) =>
      isInventoryObject(item) &&
      !item.custom &&
      Boolean(facts.describes[item.apiName]) &&
      !objectUsedInModel(item, facts),
  );
}

export function listedCustomObjects(objects: EnterpriseObject[]) {
  return objects.filter(
    (item) => item.custom && item.queryable && !isNoiseObject(item.apiName),
  );
}

export function listedInventoryObjects(objects: EnterpriseObject[]) {
  return objects.filter(isInventoryObject);
}

export function objectsReferencedByMetadata(facts: Pick<
  AssessmentFacts,
  "automations" | "validationRules" | "process"
>) {
  const names = new Set<string>();
  for (const item of facts.automations) {
    if (item.objectApiName) {
      names.add(item.objectApiName);
    }
  }
  for (const rule of facts.validationRules) {
    names.add(rule.objectApiName);
  }
  for (const rule of [
    ...(facts.process?.assignmentRules ?? []),
    ...(facts.process?.escalationRules ?? []),
    ...(facts.process?.autoResponseRules ?? []),
    ...(facts.process?.approvalProcesses ?? []),
  ]) {
    names.add(rule.objectApiName);
  }
  return [...names].filter((name) => name && name !== "Unknown");
}

export function selectWorkObjectsToDescribe(
  objects: EnterpriseObject[],
  input: {
    projectType: string;
    objective: string;
    outcomes: string[];
    referencedNames?: string[];
  },
) {
  const intent = intentText(input);
  const referenced = new Set(input.referencedNames ?? []);
  return listedInventoryObjects(objects)
    .map((item) => ({
      apiName: item.apiName,
      score:
        (referenced.has(item.apiName) ? 100 : 0) +
        (item.custom ? 10 : 0) +
        intentOverlap(`${item.label} ${item.apiName}`, intent),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.apiName.localeCompare(right.apiName),
    )
    .slice(0, describeObjectLimit)
    .map((item) => item.apiName);
}

export function durableWorkFromFacts(facts: AssessmentFacts): DurableWorkObject[] {
  const intent = intentText(facts);
  const scored = listedInventoryObjects(facts.objects)
    .map((object) =>
      scoreObject(object, facts.describes[object.apiName], intent, facts),
    )
    .filter((item) => item.usedInModel)
    .sort((left, right) => right.score - left.score);
  const primaryName = pickPrimary(scored, intent)?.apiName ?? null;

  return scored.map((item) => ({
    ...item,
    role: item.apiName === primaryName ? "primary" : "secondary",
  }));
}

function scoreObject(
  object: EnterpriseObject,
  described: ObjectDescribe | undefined,
  intent: string,
  facts: AssessmentFacts,
): DurableWorkObject {
  const fields = visibleFields(described?.fields ?? []);
  const usage = workUsage(object.apiName, facts);
  const usedInModel = objectUsedInModel(object, facts);
  const hasLifecycle = fields.some(
    (field) =>
      /^(status|stagename)$/i.test(field.apiName) &&
      (field.picklistLabels?.length ?? 0) > 0,
  );
  let score = intentOverlap(`${object.label} ${object.apiName}`, intent);
  if (object.custom) {
    score += 40;
  }
  if (usedInModel && hasLifecycle) {
    score += 30;
  }
  if (usage.customFields > 0) {
    score += 15;
  }
  if (usage.customFields >= 5) {
    score += 10;
  }
  if (usage.customRecordTypes > 0) {
    score += 15;
  }
  if (usage.automations > 0) {
    score += 15;
  }
  if (usage.validationRules > 0 || usage.assignmentRules > 0) {
    score += 10;
  }
  if (described) {
    score += 10;
  }

  return {
    apiName: object.apiName,
    label: object.label,
    kind: "service",
    custom: object.custom,
    fieldCount: fields.length,
    requiredCount: fields.filter((field) => field.required).length,
    customFieldCount: usage.customFields,
    hasLifecycle,
    usedInModel,
    score,
    role: "secondary",
  };
}

function automationTouches(
  apiName: string,
  name: string,
  objectApiName?: string | null,
) {
  if (objectApiName === apiName) {
    return true;
  }
  const stem = apiName.replace(/__c$/i, "").toLowerCase();
  const haystack = name.toLowerCase();
  return haystack.startsWith(`${stem}_`) || haystack.startsWith(`${stem} `);
}

function intentOverlap(haystack: string, intent: string) {
  const needle = haystack.toLowerCase();
  const tokens = intent.split(/\W+/).filter((token) => token.length > 3);
  return tokens.filter((token) => needle.includes(token)).length * 20;
}

function pickPrimary(ranked: DurableWorkObject[], intent: string) {
  if (ranked.length === 0) {
    return null;
  }

  const tokens = intent.split(/\W+/).filter((token) => token.length > 3);
  const intentMatch = ranked.find((item) =>
    tokens.some((token) =>
      `${item.label} ${item.apiName}`.toLowerCase().includes(token),
    ),
  );
  if (intentMatch?.custom) {
    return intentMatch;
  }

  const custom = ranked.filter((item) => item.custom);
  const standard = ranked.find((item) => !item.custom);
  if (custom.length > 0) {
    const bestCustom = custom[0];
    if (
      intentMatch &&
      !intentMatch.custom &&
      intentMatch.score >= bestCustom.score + 25
    ) {
      return intentMatch;
    }
    if (standard && standard.score >= bestCustom.score + 25) {
      return standard;
    }
    return bestCustom;
  }

  return intentMatch ?? ranked[0];
}
