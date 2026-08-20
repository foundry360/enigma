export const intelligenceRunStages = [
  { id: "connect", label: "Understanding the operating environment" },
  { id: "map", label: "Mapping work, data, and processes" },
  { id: "context", label: "Analyzing knowledge, automation, and access" },
  { id: "model", label: "Building organizational intelligence" },
  { id: "fit", label: "Identifying agent opportunities" },
  { id: "save", label: "Preparing your intelligence brief" },
] as const;

export type IntelligenceRunStageId = (typeof intelligenceRunStages)[number]["id"];

export type IntelligenceRunProgress = {
  stage: string;
  index: number;
  total: number;
  percent: number;
  done: boolean;
};

export function progressForStage(
  id: IntelligenceRunStageId,
  done = false,
): IntelligenceRunProgress {
  const index = intelligenceRunStages.findIndex((stage) => stage.id === id);
  const current = intelligenceRunStages[Math.max(index, 0)];
  const total = intelligenceRunStages.length;
  const completed = done ? total : Math.max(index, 0);

  return {
    stage: current.label,
    index: Math.max(index, 0),
    total,
    percent: Math.round((completed / total) * 100),
    done,
  };
}

export function initialRunProgress(): IntelligenceRunProgress {
  return progressForStage("connect");
}

export function parseRunProgress(value: unknown): IntelligenceRunProgress | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    typeof record.id === "string"
      ? intelligenceRunStages.find((stage) => stage.id === record.id)?.id
      : undefined;
  if (id) {
    return progressForStage(id, record.done === true);
  }

  if (typeof record.stage !== "string" || typeof record.index !== "number") {
    return null;
  }

  const stage =
    intelligenceRunStages[record.index] ??
    intelligenceRunStages.find((item) => item.label === record.stage);
  if (!stage) {
    return null;
  }

  return progressForStage(stage.id, record.done === true);
}

export function advanceRunProgress(
  current: IntelligenceRunProgress,
  next: IntelligenceRunProgress | null | undefined,
) {
  if (!next?.stage) {
    return current;
  }

  if (next.index < current.index && !next.done) {
    return current;
  }

  return next;
}
