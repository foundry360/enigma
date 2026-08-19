import { knowledgeCatalog } from "@/modules/knowledge/catalog";
import { knowledgeKinds, type KnowledgeEntry, type KnowledgeSurface } from "@/modules/knowledge/types";

const kindOrder = new Map(knowledgeKinds.map((kind, index) => [kind, index]));

export function retrieveKnowledge(input: {
  surface: KnowledgeSurface;
  question?: string;
  limit?: number;
}): KnowledgeEntry[] {
  const available = knowledgeCatalog.filter((entry) =>
    matchesSurface(entry, input.surface),
  );
  const always = available.filter((entry) => entry.always);
  const question = normalize(input.question);

  if (!question) {
    return sortEntries(always);
  }

  const scored = available
    .filter((entry) => !entry.always)
    .map((entry) => ({ entry, score: scoreEntry(entry, question) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const selected = scored
    .slice(0, input.limit ?? 4)
    .map((item) => item.entry);

  return sortEntries([...always, ...selected]);
}

export function composeKnowledge(input: {
  surface: KnowledgeSurface;
  question?: string;
  limit?: number;
}) {
  return retrieveKnowledge(input)
    .map((entry) => `${entry.title}\n${entry.content}`)
    .join("\n\n");
}

function matchesSurface(entry: KnowledgeEntry, surface: KnowledgeSurface) {
  return entry.surfaces.includes("all") || entry.surfaces.includes(surface);
}

function scoreEntry(entry: KnowledgeEntry, question: string) {
  const haystack = normalize([entry.id, entry.title, ...entry.topics].join(" "));
  let score = 0;

  for (const topic of entry.topics) {
    const needle = normalize(topic);
    if (needle && question.includes(needle)) {
      score += needle.includes(" ") ? 3 : 2;
    }
  }

  for (const word of haystack.split(" ").filter((item) => item.length > 3)) {
    if (question.includes(word)) {
      score += 1;
    }
  }

  return score;
}

function sortEntries(entries: KnowledgeEntry[]) {
  return [...entries].sort((left, right) => {
    const kind = (kindOrder.get(left.kind) ?? 99) - (kindOrder.get(right.kind) ?? 99);
    if (kind !== 0) {
      return kind;
    }

    return left.id.localeCompare(right.id);
  });
}

function normalize(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
