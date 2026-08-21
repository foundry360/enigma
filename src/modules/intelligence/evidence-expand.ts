import { resolveSignalKey } from "@/modules/intelligence/signal-advice";

export type EvidenceSignal = {
  key?: string;
  title: string;
  strength: string;
};

export type ExpandedEvidence = {
  citation: string;
  label: string;
  expansion: string;
};

export type EvidenceLayer = {
  label: string;
  paragraph: string;
};

const layerTitles = [
  "Addressable work",
  "Operating path",
  "Grounded answers",
  "Automation collision",
  "Access control",
  "Access surface",
  "Write-back control",
] as const;

const serviceNames = new Set(["case", "incident", "work order", "problem"]);
const customerNames = new Set(["account", "contact", "person account"]);
const revenueNames = new Set(["lead", "opportunity", "quote", "order", "contract"]);

export function peelLayerPrefix(citation: string): { label: string; fact: string } {
  if (
    /Published articles:\s*\d+\.\s*Draft:\s*\d+\.\s*Archived:\s*\d+/i.test(citation)
  ) {
    return { label: "Grounded answers", fact: citation };
  }

  for (const title of layerTitles) {
    const prefix = `${title}: `;
    if (citation.toLowerCase().startsWith(prefix.toLowerCase())) {
      return {
        label: title === "Access surface" ? "Access control" : title,
        fact: citation.slice(prefix.length).trim(),
      };
    }
  }

  const split = citation.indexOf(": ");
  if (split > 0 && split < 48) {
    return {
      label: inferLayer(citation.slice(split + 2)) || citation.slice(0, split),
      fact: citation.slice(split + 2).trim(),
    };
  }

  return { label: inferLayer(citation), fact: citation };
}

export function summarizeEvidenceLayers(input: {
  citations: string[];
  signals?: EvidenceSignal[];
}): EvidenceLayer[] {
  const groups = new Map<string, string[]>();

  for (const citation of input.citations) {
    const peeled = peelLayerPrefix(citation);
    const label = peeled.label || "Evidence";
    const facts = groups.get(label) ?? [];
    facts.push(peeled.fact);
    groups.set(label, facts);
  }

  return [...groups.entries()].map(([label, facts]) => ({
    label,
    paragraph: stripLayerPrefix(label, summarizeLayer(label, facts, input.signals ?? [])),
  }));
}

export function expandEvidenceCitations(input: {
  citations: string[];
  signals?: EvidenceSignal[];
}): ExpandedEvidence[] {
  const layers = summarizeEvidenceLayers(input);
  return input.citations.map((citation) => {
    const peeled = peelLayerPrefix(citation);
    const layer =
      layers.find((item) => item.label === (peeled.label || inferLayer(peeled.fact))) ??
      layers[0];
    return {
      citation,
      label: layer?.label || peeled.label,
      expansion: layer?.paragraph || ensureSentence(peeled.fact),
    };
  });
}

export function evidenceExpandPrompt(input: {
  name: string;
  citations: string[];
  signals?: EvidenceSignal[];
}) {
  const layers = summarizeEvidenceLayers(input);
  return [
    `Opportunity: ${input.name}`,
    "Write one short paragraph per evidence layer. Do not repeat the layer title inside the paragraph.",
    ...layers.map((layer) => `${layer.label}: ${layer.paragraph}`),
  ].join("\n");
}

export function parseEvidenceExpansions(
  content: string | null | undefined,
  citations: string[],
): Record<string, string> | null {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as {
      expansions?: { citation?: string; text?: string }[];
    };
    if (Array.isArray(parsed.expansions)) {
      const mapped = Object.fromEntries(
        parsed.expansions
          .filter((item) => item.citation && item.text)
          .map((item) => [item.citation!.trim(), item.text!.trim()]),
      );
      return pickGrounded(mapped, citations);
    }
  } catch {
    // labeled prose is also acceptable
  }

  return null;
}

export function isGroundedExpansion(citation: string, text: string) {
  const tokens = citation.match(/[A-Za-z][A-Za-z0-9]+|\d+/g) ?? [];
  return tokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(text));
}

export function stripLayerPrefix(label: string, text: string) {
  if (!label || !text) {
    return text;
  }

  const prefix = new RegExp(`^${escapeRegExp(label)}\\s*:\\s*`, "i");
  return text.replace(prefix, "").replace(
    new RegExp(`\\b${escapeRegExp(label)}\\b`, "gi"),
    "this layer",
  );
}

function summarizeLayer(label: string, facts: string[], signals: EvidenceSignal[]) {
  const unique = [...new Set(facts.map((fact) => fact.replace(/\.$/, "").trim()))];

  if (/write-back/i.test(label)) {
    return summarizeWriteback(unique);
  }
  if (/automation/i.test(label)) {
    return summarizeAutomations(unique);
  }
  if (/addressable|work objects/i.test(label)) {
    return summarizeWork(unique);
  }
  if (/operating/i.test(label)) {
    return summarizeOperating(unique);
  }
  if (/grounded|approved content|knowledge|published articles/i.test(label)) {
    return summarizeKnowledge(unique);
  }
  if (/access/i.test(label)) {
    return summarizeAccess(unique, signals);
  }

  return ensureSentence(unique.join(". "));
}

function summarizeWork(facts: string[]) {
  const objects = facts
    .map((fact) => fact.match(/^Work objects:\s*(.+)$/i)?.[1])
    .find(Boolean)
    ?? facts.find(
      (fact) =>
        !/has \d+ fields/i.test(fact) && !/no service, customer, or revenue/i.test(fact),
    );
  const shape = facts
    .map((fact) => fact.match(/^(.+?) has (\d+) fields \((\d+) required\)$/i))
    .find(Boolean);
  const missing = facts.some((fact) => /no service, customer, or revenue/i.test(fact));

  if (missing || !objects) {
    return "The run did not find a service, customer, or revenue work object, so an agent has no durable record to sit on.";
  }

  const names = splitNames(objects);
  const service = names.filter((name) => kindOf(name) === "service");
  const context = names.filter((name) => {
    const kind = kindOf(name);
    return kind === "customer" || kind === "revenue";
  });
  const parts: string[] = [];

  if (service.length > 0) {
    parts.push(
      `${joinAnd(service)} ${service.length === 1 ? "is" : "are"} the durable work ${service.length === 1 ? "record" : "records"} an agent can read and act on`,
    );
  } else {
    parts.push(`${joinAnd(names)} ${names.length === 1 ? "is" : "are"} present as work objects`);
  }

  if (context.length > 0) {
    parts.push(
      `${joinAnd(context)} ${context.length === 1 ? "gives" : "give"} customer and revenue context around that work`,
    );
  }

  if (shape) {
    const [, objectName, fieldCount, requiredCount] = shape;
    parts.push(
      Number(requiredCount) === 0
        ? `${objectName} has ${fieldCount} fields, so there is structured work to read, but none of those fields are required`
        : `${objectName} has ${fieldCount} fields, including ${requiredCount} required`,
    );
  }

  return ensureSentence(parts.join(". "));
}

function summarizeOperating(facts: string[]) {
  const objects = facts
    .map((fact) => fact.match(/^Operating objects:\s*(.+)$/i)?.[1])
    .find(Boolean)
    ?? facts.find((fact) => !/no service or revenue/i.test(fact));
  if (!objects || /no service or revenue/i.test(facts.join(" "))) {
    return "The run did not find a service or revenue path object, so there is no clear start or handoff for an agent to follow.";
  }

  const names = splitNames(objects);
  return `${joinAnd(names)} ${names.length === 1 ? "gives" : "give"} the agent a recognizable path, so conversations can be counted against a known start and handoff instead of unbounded chat.`;
}

function summarizeKnowledge(facts: string[]) {
  const joined = facts.join(" ");
  const counts = facts
    .map((fact) =>
      fact.match(
        /(?:Published articles:\s*)?(\d+)\.\s*Draft:\s*(\d+)\.\s*Archived:\s*(\d+)/i,
      ),
    )
    .find(Boolean);

  if (counts) {
    const published = Number(counts[1]);
    const draft = Number(counts[2]);
    const archived = Number(counts[3]);
    if (published > 0) {
      return `The run counted ${published} published ${
        published === 1 ? "article" : "articles"
      } (${draft} draft, ${archived} archived), so an agent could retrieve those answers. Counts are not coverage or freshness.`;
    }
    if (draft + archived > 0) {
      return `The run counted no published articles (${draft} draft, ${archived} archived), so there is no live knowledge base to retrieve from.`;
    }
    return "The run counted no draft, published, or archived articles, so an agent would invent answers or look outside the org.";
  }

  if (
    /article content was not observed|article counts were not observed/i.test(
      joined,
    )
  ) {
    return "Article content was not observed, so grounded answers cannot be judged.";
  }

  if (/no knowledge base|no approved knowledge|no knowledge articles/i.test(joined)) {
    return "The run did not find knowledge articles, so an agent would invent answers or look outside the org.";
  }

  return "Article content was not observed, so grounded answers cannot be judged.";
}

function summarizeAutomations(facts: string[]) {
  const count = facts
    .map((fact) => fact.match(/^(\d+) automations \((\d+) active\)$/i))
    .find(Boolean);
  const named = facts
    .map((fact) => fact.match(/^Active automations:\s*(.+)$/i)?.[1])
    .find(Boolean);
  const listed = facts.filter((fact) => /^(Flow|Apex trigger)\s+/i.test(fact));

  const total = count ? Number(count[1]) : null;
  const active = count ? Number(count[2]) : listed.length || null;
  const names = named
    ? named
    : listed.length > 0
      ? joinAnd(listed.map((item) => item.replace(/\.$/, "")))
      : "";

  if (active === 0) {
    return "No active automations were found. Work looks manual today, so an agent may become the first system of action on this path.";
  }

  const opening =
    total != null && active != null
      ? `The run found ${total} ${total === 1 ? "automation" : "automations"}, ${active} active`
      : "The run found active automations";
  if (names) {
    return `${opening}: ${names}. Those paths can write the same work an agent would touch, so volume should assume overlap rather than clean deflection.`;
  }

  return `${opening}. The names and triggers were not listed on this run, so collision stays a risk until those automations are named.`;
}

function summarizeAccess(facts: string[], signals: EvidenceSignal[]) {
  if (/could not be read/i.test(facts.join(" "))) {
    return "Access control could not be read, so it is not possible to judge whether an agent identity can be constrained.";
  }

  const combined = facts
    .map((fact) => fact.match(/^(\d+) profiles and (\d+) permission sets\.?$/i))
    .find(Boolean);
  const profileFact = facts
    .map((fact) => fact.match(/^(\d+) profiles(?::\s*(.+))?\.?$/i))
    .find(Boolean);
  const permissionFact = facts
    .map((fact) => fact.match(/^(\d+) permission sets(?::\s*(.+))?\.?$/i))
    .find(Boolean);
  const profileCount = combined?.[1] ?? profileFact?.[1];
  const permissionCount = combined?.[2] ?? permissionFact?.[1];
  if (!profileCount || !permissionCount) {
    return "Access control could not be read, so it is not possible to judge whether an agent identity can be constrained.";
  }

  const access = signals.find(
    (signal) => resolveSignalKey(signal.key, signal.title) === "access_surface",
  );
  const fact = `${profileCount} ${profileCount === "1" ? "profile" : "profiles"} and ${permissionCount} permission ${permissionCount === "1" ? "set" : "sets"} were read`;
  if (access?.strength === "weak") {
    return `${fact}. That breadth makes a dedicated agent identity harder, so a broad human profile should not be reused.`;
  }
  return `${fact}. That shape is what lets you limit what an agent identity can see and change.`;
}

function summarizeWriteback(facts: string[]) {
  const rules = facts
    .map((fact) => fact.match(/^(\d+) write rules \((\d+) active\)$/i))
    .find(Boolean);
  const required = facts
    .map((fact) => fact.match(/^(.+?) has (\d+) required fields$/i))
    .find(Boolean);
  const named = facts.filter(
    (fact) =>
      / on [A-Za-z]/.test(fact) &&
      !/required fields/i.test(fact) &&
      !/write rules/i.test(fact),
  );

  const parts: string[] = [];
  if (named.length > 0) {
    parts.push(`Write rules on the path include ${joinAnd(named.map((item) => item.replace(/\.$/, "")))}`);
  } else if (rules) {
    const total = Number(rules[1]);
    const active = Number(rules[2]);
    parts.push(
      active === 0
        ? `The run found ${total} write ${total === 1 ? "rule" : "rules"}, and none are active`
        : `The run found ${total} write ${total === 1 ? "rule" : "rules"}, ${active} active`,
    );
  }

  if (required) {
    const [, objectName, count] = required;
    parts.push(
      Number(count) === 0
        ? `${objectName} has no required fields`
        : `${objectName} has ${count} required ${count === "1" ? "field" : "fields"} a write must satisfy`,
    );
  }

  const thin =
    (rules && Number(rules[2]) === 0) || (required && Number(required[2]) === 0);
  if (thin) {
    const objectName = required?.[1] ?? "the work object";
    parts.push(
      `An agent could save an incomplete ${objectName} because nothing on the write path would reject it`,
    );
  } else if (parts.length > 0) {
    parts.push("Those controls are what an agent write-back has to respect");
  }

  return ensureSentence(parts.join(". ") || facts.join(". "));
}

function inferLayer(citation: string) {
  if (/work objects|has \d+ fields/i.test(citation)) {
    return "Addressable work";
  }
  if (/operating objects/i.test(citation)) {
    return "Operating path";
  }
  if (/approved content|knowledge source|knowledge base|knowledge article types|article counts were not observed|published articles|article content was not observed/i.test(citation)) {
    return "Grounded answers";
  }
  if (/automation|apex trigger|^flow /i.test(citation)) {
    return "Automation collision";
  }
  if (/profile|permission set|access control could not/i.test(citation)) {
    return "Access control";
  }
  if (
    /write rule|required field/i.test(citation) ||
    /^[A-Za-z][\w]+ on [A-Za-z][\w]+/.test(citation)
  ) {
    return "Write-back control";
  }
  return "";
}

function pickGrounded(
  mapped: Record<string, string>,
  citations: string[],
): Record<string, string> | null {
  const next = Object.fromEntries(
    citations
      .map((citation) => {
        const text = mapped[citation];
        return text && isGroundedExpansion(citation, text)
          ? [citation, ensureSentence(stripLayerPrefix(peelLayerPrefix(citation).label, text))]
          : null;
      })
      .filter((item): item is [string, string] => item != null),
  );

  return Object.keys(next).length > 0 ? next : null;
}

function kindOf(name: string) {
  const key = name.trim().toLowerCase();
  if (serviceNames.has(key)) {
    return "service";
  }
  if (customerNames.has(key)) {
    return "customer";
  }
  if (revenueNames.has(key)) {
    return "revenue";
  }
  return "other";
}

function splitNames(value: string) {
  return value
    .replace(/\.$/, "")
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function ensureSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(body) ? body : `${body}.`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
