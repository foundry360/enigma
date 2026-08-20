import {
  formatCurrency,
  formatCurrencyPrecise,
  formatMultiple,
  formatPercent,
} from "@/lib/format";
import { recommendationLabel, type RecommendationState } from "@/modules/economics/model";

export const storySlotKeys = [
  "volume",
  "share",
  "impacted",
  "hours",
  "labor",
  "value",
  "workItemCost",
  "consumption",
  "net",
  "roc",
  "state",
] as const;

export type StorySlot = (typeof storySlotKeys)[number];

export type StorySlotValues = Record<StorySlot, string>;

const slotPattern = /\{\{([a-zA-Z]+)\}\}/g;

export function hasStorySlots(text: string | null | undefined) {
  if (!text) {
    return false;
  }

  return storySlotKeys.some((slot) => text.includes(`{{${slot}}}`));
}

export function stripEmDashes(text: string) {
  return text.replace(/\s*[—–―]\s*/g, ", ").replace(/[—–―]/g, "");
}

export function fillStorySlots(
  text: string,
  values: Partial<StorySlotValues>,
) {
  return stripEmDashes(text).replace(slotPattern, (match, key: string) => {
    if (!isStorySlot(key)) {
      return match;
    }

    return values[key] ?? "not set";
  });
}

export function storyValues(input: {
  volume: number | null;
  share: number | null;
  impacted: number | null;
  hours: number | null;
  labor: number | null;
  value: number | null;
  workItemCost: number | null;
  consumption: number | null;
  net: number | null;
  roc: number | null;
  state: RecommendationState | string;
}): StorySlotValues {
  const stateLabel =
    input.state in recommendationLabel
      ? recommendationLabel[input.state as RecommendationState]
      : input.state;

  return {
    volume: formatCount(input.volume),
    share: present(input.share) ? formatPercent(input.share) : "not set",
    impacted: formatCount(input.impacted),
    hours:
      present(input.hours)
        ? `${input.hours} ${input.hours === 1 ? "hour" : "hours"}`
        : "not set",
    labor: present(input.labor) ? formatCurrencyPrecise(input.labor) : "not set",
    value: present(input.value) ? formatCurrency(input.value) : "not set",
    workItemCost: present(input.workItemCost)
      ? formatCurrencyPrecise(input.workItemCost)
      : "not set",
    consumption: present(input.consumption)
      ? formatCurrency(input.consumption)
      : "not set",
    net: present(input.net) ? formatCurrency(input.net) : "not set",
    roc: present(input.roc) ? formatMultiple(input.roc) : "not set",
    state: stateLabel,
  };
}

export function fallbackJustificationStory(input: {
  complete: boolean;
  process: string | null;
  area: string | null;
  capability: string | null;
  valueDrivers: string[];
  consumptionDrivers: string[];
  constraints: string[];
}) {
  if (!input.complete) {
    return "There is not yet a deploy story to tell. Work per year, hours on one item, or labor cost are still missing, and Enigma will not invent work volume, hours, labor cost, or an official Salesforce price to fill the gap. Add those inputs and this justification will write itself from the live numbers.";
  }

  const namedWork = input.process
    ? uncapitalize(input.process)
    : "this work";
  const inArea = input.area ? ` in ${input.area}` : "";
  const capability = input.capability
    ? `${article(input.capability)} ${uncapitalize(input.capability)}`
    : "an agent";

  return [
    `About {{volume}} of this ${namedWork} happens a year${inArea}. At {{share}}, an agent would take {{impacted}} of it. Keeping people on that work costs {{value}}. That is {{impacted}} at {{hours}} each, at {{labor}} an hour. That is the human cost of leaving the work where it is.`,
    `Taking the same work costs {{consumption}} to run, at {{workItemCost}} each time. That rate is not a wage and not an official Salesforce price. It is the operating cost they will stand behind. After paying to run it, {{net}} stays on the table, and every dollar spent to run it returns {{roc}} of that human value. That is the picture: the human cost of the work versus the cost to run it.`,
    [
      `What is in view is ${capability} on ${namedWork}${inArea}.`,
      input.valueDrivers[0]
        ? `The value they are after is ${uncapitalize(input.valueDrivers[0])}.`
        : null,
      input.consumptionDrivers[0]
        ? `What would be consumed is ${uncapitalize(input.consumptionDrivers[0])}.`
        : null,
      input.constraints[0]
        ? `One thing already on this opportunity: ${uncapitalize(input.constraints[0])}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  ].join("\n\n");
}

export function fallbackRecommendationStory(complete: boolean) {
  if (!complete) {
    return "Do not proceed until work per year, hours on one today, and labor cost are present on at least one opportunity. Enigma will not invent those numbers.";
  }

  return [
    `The recommendation is {{state}}. At {{share}} share the agent would take {{impacted}} of {{volume}} work this year. People cost is {{value}}. Cost to run that work is {{consumption}}. Net is {{net}}. ROC is {{roc}}.`,
    "Use the opportunity as it is named on this case. Do not treat go-live as unconstrained until the holds on this case close.",
  ].join("\n\n");
}

export function acceptCaseStories(
  raw: string | null,
  fallback: { justification: string; recommendation: string },
) {
  const parsed = parseStoryJson(raw);
  const justification = sanitizeStory(parsed?.justification, fallback.justification);
  const recommendation = sanitizeStory(
    parsed?.recommendation,
    fallback.recommendation,
  );
  const fromModel =
    justification !== fallback.justification ||
    recommendation !== fallback.recommendation;

  return {
    justificationNarrative: justification,
    recommendationNarrative: recommendation,
    fromModel,
  };
}

function sanitizeStory(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const cleaned = stripEmDashes(value).trim();
  if (!hasStorySlots(cleaned)) {
    return fallback;
  }

  return cleaned;
}

function parseStoryJson(raw: string | null) {
  if (!raw) {
    return null;
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      justification?: unknown;
      recommendation?: unknown;
    };
    return {
      justification:
        typeof parsed.justification === "string" ? parsed.justification : undefined,
      recommendation:
        typeof parsed.recommendation === "string"
          ? parsed.recommendation
          : undefined,
    };
  } catch {
    return null;
  }
}

function formatCount(value: number | null) {
  if (!present(value)) {
    return "not set";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function present(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function isStorySlot(value: string): value is StorySlot {
  return storySlotKeys.includes(value as StorySlot);
}

function article(value: string) {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function uncapitalize(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
