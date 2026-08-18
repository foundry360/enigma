export type SnapshotItem = {
  key: string;
  title: string;
  score: number;
};

export type SnapshotComparison = SnapshotItem & {
  previousScore: number | null;
  delta: number | null;
};

export function compareOpportunitySnapshots(
  current: SnapshotItem[],
  previous: SnapshotItem[] | null,
): SnapshotComparison[] {
  const prior = new Map((previous ?? []).map((item) => [item.key, item.score]));

  return [...current]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .map((item) => {
      const previousScore = prior.get(item.key) ?? null;
      return {
        ...item,
        previousScore,
        delta: previousScore == null ? null : item.score - previousScore,
      };
    });
}
