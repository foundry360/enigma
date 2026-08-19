export const knowledgeKinds = [
  "identity",
  "instruction",
  "prompt",
  "guardrail",
  "constraint",
  "glossary",
  "process",
  "formula",
] as const;

export type KnowledgeKind = (typeof knowledgeKinds)[number];

export const knowledgeSurfaces = ["ask", "case-narrative", "all"] as const;

export type KnowledgeSurface = (typeof knowledgeSurfaces)[number];

export type KnowledgeEntry = {
  id: string;
  title: string;
  kind: KnowledgeKind;
  surfaces: KnowledgeSurface[];
  always?: boolean;
  topics: string[];
  content: string;
};
