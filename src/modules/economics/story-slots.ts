import {
  formatCurrency,
  formatCurrencyPrecise,
  formatMultiple,
  formatPercent,
} from "@/lib/format";
import { recommendationLabel, type RecommendationState } from "@/modules/economics/model";
import { alignReasonToOpportunity, scrubFitReason } from "@/modules/intelligence/opportunity-summaries";
import {
  describeWeakSignal,
  signalAdvice,
} from "@/modules/intelligence/signal-advice";

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

const storyScopeVersion = "10";

export function caseStoryScope(
  opportunityIds: string[],
  assessmentId?: string | null,
) {
  const opportunities = [...opportunityIds].filter(Boolean).sort().join(",");
  const body = assessmentId ? `${assessmentId}:${opportunities}` : opportunities;
  return `${storyScopeVersion}:${body}`;
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
  assessmentId?: string | null;
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

  return (
    readStoryScope(input.intelligence) !==
    caseStoryScope(input.opportunityIds, input.assessmentId)
  );
}

export function storiesCoverOpportunities(
  text: string | null | undefined,
  names: string[],
) {
  const expected = uniqueNames(names);
  if (expected.length <= 1) {
    return storiesStayOnRoster(text, names);
  }

  const haystack = (text ?? "").toLowerCase();
  return (
    expected.every((name) => haystack.includes(name.toLowerCase())) &&
    storiesStayOnRoster(text, names)
  );
}

export function storiesStayOnRoster(
  text: string | null | undefined,
  names: string[],
) {
  return offRosterAgents(text, names).length === 0;
}

export function alignStoriesToRoster(
  text: string,
  names: Array<string | null | undefined> | undefined,
) {
  const roster = uniqueNames(names);
  const replacement = roster[0] ?? "this opportunity";
  let next = text;
  for (const name of offRosterAgents(next, roster)) {
    next = next.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi"), replacement);
  }
  if (!roster.some((name) => /\bservice agent\b/i.test(name))) {
    next = next
      .replace(/\bthe service agent\b/gi, replacement)
      .replace(/\ba service agent\b/gi, replacement)
      .replace(/\bservice agent\b/gi, replacement);
  }
  return next;
}

function offRosterAgents(
  text: string | null | undefined,
  names: Array<string | null | undefined> | undefined,
) {
  const roster = new Set(uniqueNames(names).map((name) => name.toLowerCase()));
  const found = new Set<string>();
  for (const match of (text ?? "").matchAll(
    /\b([A-Z][A-Za-z0-9]*(?:[ /&][A-Z][A-Za-z0-9]*)* agent)\b/g,
  )) {
    found.add(match[1]);
  }
  if (/\bservice agent\b/i.test(text ?? "")) {
    found.add("Service agent");
  }
  return [...found].filter((name) => !roster.has(name.toLowerCase()));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripEmDashes(text: string) {
  return text.replace(/\s*[—–―]\s*/g, ", ").replace(/[—–―]/g, "");
}

const TOKEN = "\u0001";
const DECIMAL = "\u0000";

export function formatStoryText(text: string) {
  const tokens: string[] = [];
  let value = stripEmDashes(stripSourceMarks(text))
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
  opportunityNames?: Array<string | null | undefined>,
) {
  const names = uniqueNames(opportunityNames);
  const formatted = alignStoriesToRoster(formatStoryText(stripStoryScope(text)), names);
  return formatted.replace(slotPattern, (match, key: string) => {
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

export type CaseStoryOpportunity = {
  name?: string | null;
  process?: string | null;
  capability?: string | null;
  confidence?: string | null;
  finding?: string | null;
  signals?: Array<{
    key?: string;
    title?: string | null;
    strength?: string | null;
  }>;
  evidence?: Array<string | { citation?: string | null; tool?: string | null }>;
};

export function fallbackJustificationStory(input: {
  complete: boolean;
  process: string | null;
  area: string | null;
  capability: string | null;
  opportunityNames?: string[];
  opportunities?: CaseStoryOpportunity[];
  valueDrivers?: Array<string | null | undefined>;
  consumptionDrivers?: Array<string | null | undefined>;
  constraints?: Array<string | null | undefined>;
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

  const opportunities = namedOpportunities(
    input.opportunities,
    input.opportunityNames,
  );
  const many = opportunities.length > 1;
  const namedWork = input.process
    ? input.process.trim().toLowerCase()
    : "this work";
  const workPhrase = many ? "work across these opportunities" : namedWork;
  const inArea = !many && input.area ? ` in ${input.area}` : "";
  const value = uniqueNames(input.valueDrivers).slice(0, 3);
  const consumed = uniqueNames(input.consumptionDrivers).slice(0, 3);
  const holds = uniqueNames(input.constraints).slice(0, 4);
  const picture = caseSignalPicture(opportunities);
  const roster = opportunities
    .map((item) => opportunityJustification(item))
    .filter(Boolean);

  return formatStoryText(
    [
      `About {{volume}} of ${workPhrase} happens a year${inArea}. At {{share}}, an agent would take {{impacted}} of it. Keeping people on that work costs {{value}}, which is {{impacted}} at {{hours}} each, at {{labor}} an hour.`,
      `Running the same work costs {{consumption}}, at {{workItemCost}} each time. That rate is not a wage and not an official Salesforce price. After paying to run it, {{net}} stays on the table, and every dollar spent returns {{roc}} of that human value.`,
      ...picture,
      ...roster,
      [
        value.length
          ? `The value they are after is ${joinAnd(value.map((item) => item.trim().toLowerCase()))}.`
          : null,
        consumed.length
          ? `What would be consumed is ${joinAnd(consumed.map((item) => item.trim().toLowerCase()))}.`
          : null,
        holds.length
          ? `Already on this case: ${joinAnd(holds.map((item) => item.trim().toLowerCase()))}.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

export function fallbackRecommendationStory(input: {
  complete: boolean;
  opportunityNames?: string[];
  opportunities?: CaseStoryOpportunity[];
  constraints?: Array<string | null | undefined>;
  recommendationState?: RecommendationState | string | null;
  recommendationWhy?: string | null;
}) {
  if (!input.complete) {
    return formatStoryText(
      [
        "Do not proceed until work per year, hours on one today, and labor cost are present on at least one opportunity.",
        "Enigma will not invent those numbers.",
      ].join("\n\n"),
    );
  }

  const opportunities = namedOpportunities(
    input.opportunities,
    input.opportunityNames,
  );
  const weak = uniqueSignals(
    opportunities.flatMap((item) =>
      (item.signals ?? []).filter((signal) => signal.strength === "weak"),
    ),
  );
  const mixed = uniqueSignals(
    opportunities.flatMap((item) =>
      (item.signals ?? []).filter((signal) => signal.strength === "mixed"),
    ),
  );
  const weakNames = uniqueNames(
    weak.map((signal) => signalAdvice({ key: signal.key, title: signal.title }).title),
  );
  const holds = uniqueNames(input.constraints).slice(0, 4);
  const next =
    weakNames.length > 0
      ? `Confirm the case, but do not treat go-live as unconstrained until ${joinAnd(weakNames)} ${weakNames.length === 1 ? "strengthens" : "strengthen"}. Close those readiness holds, and the recommendation can move off {{state}}.`
      : input.recommendationWhy?.trim() ||
        "Do not treat go-live as unconstrained until the readiness holds on this case close.";

  return formatStoryText(
    [
      recommendationOpening(input.recommendationState),
      opportunityRoster(opportunities),
      ...mixed.map((signal) => mixedSignalHold(signal)),
      ...weak.map((signal) =>
        describeWeakSignal({
          key: signal.key,
          title: signal.title,
          strength: signal.strength,
        }),
      ),
      holds.length
        ? `Keep these constraints in view as you stand up the work: ${joinAnd(holds.map((item) => item.trim().toLowerCase()))}.`
        : "",
      next,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

function namedOpportunities(
  opportunities: CaseStoryOpportunity[] | undefined,
  names?: string[],
) {
  const listed = (opportunities ?? []).filter(
    (item) => typeof item.name === "string" && item.name.trim(),
  );
  const unique: CaseStoryOpportunity[] = [];
  const seen = new Set<string>();
  for (const item of listed) {
    const key = item.name!.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  if (unique.length > 0) {
    return unique;
  }

  return uniqueNames(names).map((name) => ({ name }));
}

function opportunityJustification(item: CaseStoryOpportunity) {
  const name = item.name!.trim();
  const process = item.process?.trim()
    ? item.process.trim().toLowerCase()
    : null;
  const confidence = item.confidence?.trim() || null;
  const finding = distinctFinding(item, name);
  const lead = process
    ? `${name} sits on ${process}${confidence ? ` as a ${confidence}-confidence opportunity` : ""}`
    : `${name} is on this case${confidence ? ` as a ${confidence}-confidence opportunity` : ""}`;

  return ensureSentence(
    `${lead}${finding ? `. ${stripLeadingCap(finding)}` : ""}`,
  );
}

function opportunityRoster(opportunities: CaseStoryOpportunity[]) {
  if (opportunities.length === 0) {
    return "";
  }

  const sentences = opportunities.map((item) => {
    const name = item.name!.trim();
    const process = item.process?.trim()
      ? item.process.trim().toLowerCase()
      : null;
    const confidence = item.confidence?.trim() || null;
    if (process && confidence) {
      return `${name} covers ${process} at ${confidence} confidence.`;
    }
    if (process) {
      return `${name} covers ${process}.`;
    }
    return `${name} stays on this case.`;
  });

  return sentences.join(" ");
}

function caseSignalPicture(opportunities: CaseStoryOpportunity[]) {
  const signals = uniqueSignals(
    opportunities.flatMap((item) => item.signals ?? []),
  );
  if (signals.length === 0) {
    return [];
  }

  const strong: string[] = [];
  const mixed: string[] = [];
  const weak: string[] = [];
  for (const signal of signals) {
    const copy = signalAdvice({ key: signal.key, title: signal.title });
    if (signal.strength === "strong") {
      strong.push(`${copy.title} is strong. ${copy.meaning}`);
      continue;
    }
    if (signal.strength === "mixed") {
      mixed.push(`${copy.title} is mixed. ${copy.meaning} ${copy.risk}`);
      continue;
    }
    weak.push(`${copy.title} is still weak. ${copy.meaning} ${copy.risk}`);
  }

  return [strong.join(" "), mixed.join(" "), weak.join(" ")].filter(Boolean);
}

function mixedSignalHold(signal: {
  key?: string;
  title?: string | null;
  strength?: string | null;
}) {
  const copy = signalAdvice({
    key: signal.key,
    title: signal.title ?? "This signal",
  });
  return `${copy.title} is mixed. ${copy.risk} ${copy.next}`;
}

function distinctFinding(item: CaseStoryOpportunity, name: string) {
  const sentences = splitSentences(storyFinding(item, name)).filter(
    (sentence) => !isSharedSignalSentence(sentence),
  );
  return sentences.join(" ").trim();
}

function isSharedSignalSentence(sentence: string) {
  const trimmed = sentence.trim();
  return (
    /^(addressable work|operating path|grounded answers|write-back control|automation collision|access control)\b/i.test(
      trimmed,
    ) ||
    /path is supported but not unconstrained/i.test(trimmed) ||
    /no supporting signals were inherited/i.test(trimmed)
  );
}

function stripLeadingCap(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function storyFinding(item: CaseStoryOpportunity, name: string) {
  const cleaned = (item.finding ?? "")
    .replace(/\s*Fit judged by[^.]*\./gi, " ")
    .replace(/Ranked from metadata on this run[^.]*\./gi, " ")
    .replace(/A model pass was not available[^.]*\./gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ensureSentence(
    alignReasonToOpportunity(
      scrubFitReason(cleaned, item.signals ?? []),
      name,
    ),
  );
}

function recommendationOpening(state?: RecommendationState | string | null) {
  if (state === "proceed_with_conditions") {
    return "The numbers support moving forward. ROC is {{roc}} and annual net is {{net}}. The hold is readiness, not the arithmetic.";
  }

  if (state === "proceed") {
    return "The case is ready to proceed. ROC is {{roc}} and annual net is {{net}}.";
  }

  return "The recommendation stays at {{state}}. ROC is {{roc}} and annual net is {{net}}.";
}

function uniqueSignals(
  signals: Array<{ key?: string; title?: string | null; strength?: string | null }>,
) {
  const seen = new Set<string>();
  const next: Array<{ key?: string; title: string; strength: string }> = [];
  for (const signal of signals) {
    const title = signal.title?.trim();
    if (!title || !signal.strength) {
      continue;
    }
    const id = `${signal.key ?? ""}:${title}:${signal.strength}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    next.push({ key: signal.key, title, strength: signal.strength });
  }
  return next;
}

function stripSourceMarks(text: string) {
  return text.replace(/\s*⟦[^⟦⟧]*⟧/g, "");
}

function ensureSentence(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  const body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(body) ? body : `${body}.`;
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
    .split(/\n\s*\n/)
    .map((block) =>
      block.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]+/g, " ").trim(),
    )
    .filter(Boolean);

  const paragraphs: string[] = [];
  let pending: string[] = [];

  const flush = () => {
    if (pending.length === 0) {
      return;
    }
    paragraphs.push(pending.join(" "));
    pending = [];
  };

  for (const block of blocks) {
    const sentences = splitSentences(block);
    if (sentences.length > 5) {
      flush();
      paragraphs.push(...groupSentences(sentences));
      continue;
    }
    if (sentences.length >= 2) {
      flush();
      paragraphs.push(sentences.join(" "));
      continue;
    }
    pending.push(...(sentences.length > 0 ? sentences : [block]));
    if (pending.length >= 3) {
      flush();
    }
  }
  flush();
  return paragraphs;
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

function uniqueNames(values: Array<string | null | undefined> | undefined) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of values ?? []) {
    if (typeof value !== "string") {
      continue;
    }
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
