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

const storyScopeMarker = /^\[story-scope:([^\]]*)\]\n?/;

export function hasStorySlots(text: string | null | undefined) {
  if (!text) {
    return false;
  }

  return storySlotKeys.some((slot) => text.includes(`{{${slot}}}`));
}

export function caseStoryScope(opportunityIds: string[]) {
  return [...opportunityIds].filter(Boolean).sort().join(",");
}

export function readStoryScope(text: string | null | undefined) {
  const match = text?.match(storyScopeMarker);
  return match ? match[1] : null;
}

export function stripStoryScope(text: string | null | undefined) {
  return (text ?? "").replace(storyScopeMarker, "");
}

export function withStoryScope(text: string | null | undefined, scope: string) {
  return `[story-scope:${scope}]\n${stripStoryScope(text)}`;
}

export function shouldRefreshCaseStories(input: {
  force?: boolean;
  justification: string | null | undefined;
  recommendation: string | null | undefined;
  intelligence: string | null | undefined;
  opportunityIds: string[];
}) {
  if (input.force) {
    return true;
  }

  if (
    !hasStorySlots(input.justification) ||
    !hasStorySlots(input.recommendation)
  ) {
    return true;
  }

  return readStoryScope(input.intelligence) !== caseStoryScope(input.opportunityIds);
}

export function storiesCoverOpportunities(
  text: string | null | undefined,
  names: string[],
) {
  const expected = uniqueNames(names);
  if (expected.length <= 1) {
    return true;
  }

  const haystack = (text ?? "").toLowerCase();
  return expected.every((name) => haystack.includes(name.toLowerCase()));
}

export function stripEmDashes(text: string) {
  return text.replace(/\s*[—–―]\s*/g, ", ").replace(/[—–―]/g, "");
}

const TOKEN = "\u0001";
const DECIMAL = "\u0000";

export function formatStoryText(text: string) {
  const tokens: string[] = [];
  let value = stripEmDashes(text)
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\{\{[a-zA-Z]+\}\}/g, (token) => {
      tokens.push(token);
      return `${TOKEN}${tokens.length - 1}${TOKEN}`;
    })
    .replace(/(\d)\.(\d)/g, `$1${DECIMAL}$2`)
    .trim();

  if (!value) {
    return "";
  }

  const paragraphs = toStoryParagraphs(value)
    .map(formatStoryParagraph)
    .filter(Boolean);

  return paragraphs
    .join("\n\n")
    .replaceAll(DECIMAL, ".")
    .replace(
      new RegExp(`${TOKEN}(\\d+)${TOKEN}`, "g"),
      (_, index: string) => tokens[Number(index)] ?? "",
    );
}

export function fillStorySlots(
  text: string,
  values: Partial<StorySlotValues>,
) {
  return formatStoryText(text).replace(slotPattern, (match, key: string) => {
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
  opportunityNames?: string[];
  valueDrivers: string[];
  consumptionDrivers: string[];
  constraints: string[];
}) {
  if (!input.complete) {
    return formatStoryText(
      [
        "There is not yet a deploy story to tell.",
        "Work per year, hours on one item, or labor cost are still missing, and Enigma will not invent work volume, hours, labor cost, or an official Salesforce price to fill the gap.",
        "Add those inputs and this justification will write itself from the live numbers.",
      ].join("\n\n"),
    );
  }

  const named = uniqueNames(input.opportunityNames);
  const namedWork = input.process
    ? uncapitalize(input.process)
    : "this work";
  const inArea = input.area ? ` in ${input.area}` : "";
  const capability = input.capability
    ? `${article(input.capability)} ${uncapitalize(input.capability)}`
    : "an agent";
  const inView =
    named.length > 1
      ? `What is in view is ${joinAnd(named)}.`
      : `What is in view is ${capability} on ${namedWork}${inArea}.`;

  return formatStoryText(
    [
      `About {{volume}} of this ${namedWork} happens a year${inArea}. At {{share}}, an agent would take {{impacted}} of it.`,
      `Keeping people on that work costs {{value}}. That is {{impacted}} at {{hours}} each, at {{labor}} an hour. That is the human cost of leaving the work where it is.`,
      `Taking the same work costs {{consumption}} to run, at {{workItemCost}} each time. That rate is not a wage and not an official Salesforce price. It is the operating cost they will stand behind. After paying to run it, {{net}} stays on the table, and every dollar spent to run it returns {{roc}} of that human value.`,
      [
        inView,
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
    ].join("\n\n"),
  );
}

export function fallbackRecommendationStory(
  complete: boolean,
  opportunityNames: string[] = [],
) {
  if (!complete) {
    return formatStoryText(
      [
        "Do not proceed until work per year, hours on one today, and labor cost are present on at least one opportunity.",
        "Enigma will not invent those numbers.",
      ].join("\n\n"),
    );
  }

  const named = uniqueNames(opportunityNames);
  const roster =
    named.length > 1
      ? `This case covers ${joinAnd(named)}. Use each of them as named.`
      : named.length === 1
        ? `Use ${named[0]} as it is named on this case.`
        : "Use the opportunity as it is named on this case.";

  return formatStoryText(
    [
      "The recommendation is {{state}}.",
      `At {{share}} share, an agent would take {{impacted}} of {{volume}} work this year. People cost is {{value}}. Cost to run that work is {{consumption}}. After that, net is {{net}} and ROC is {{roc}}.`,
      `${roster} Do not treat go-live as unconstrained until the holds on this case close.`,
    ].join("\n\n"),
  );
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

  const cleaned = formatStoryText(value);
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

function toStoryParagraphs(text: string) {
  const blocks = text
    .split(/\n+/)
    .map((block) => block.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [];
  }

  if (blocks.length === 1) {
    return groupSentences(splitSentences(blocks[0]));
  }

  return blocks.flatMap((block) => {
    const sentences = splitSentences(block);
    return sentences.length > 5 ? groupSentences(sentences) : [block];
  });
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function groupSentences(sentences: string[]) {
  if (sentences.length === 0) {
    return [];
  }
  if (sentences.length <= 3) {
    return [sentences.join(" ")];
  }

  const paragraphCount = sentences.length <= 6 ? 2 : 3;
  const size = Math.ceil(sentences.length / paragraphCount);
  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += size) {
    paragraphs.push(sentences.slice(index, index + size).join(" "));
  }
  return paragraphs;
}

function formatStoryParagraph(paragraph: string) {
  let value = paragraph.replace(/[ \t]+/g, " ").trim();
  if (!value) {
    return "";
  }

  value = value.replace(/ +([,;:])/g, "$1");
  value = value.replace(/([,;:])(?=\S)/g, "$1 ");
  value = value.replace(/([!?])(?=[A-Za-z])/g, "$1 ");
  value = value.replace(/([.])(?=[A-Z])/g, "$1 ");
  value = value.replace(/\.{3,}/g, "...");
  value = value.replace(/([^.])\.{2}(?!\.)/g, "$1.");
  value = value.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_match, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`,
  );
  value = value.replace(/\bRoc\b/g, "ROC");
  value = value.replace(/\bRoi\b/g, "ROI");

  if (!/[.!?]$/.test(value) && !new RegExp(`${TOKEN}\\d+${TOKEN}$`).test(value)) {
    value = `${value}.`;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
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

function uniqueNames(values: string[] | undefined) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of values ?? []) {
    const name = value.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
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
