"use client";

import { useEffect, useState } from "react";

export const LOAD_MORE_SIZE = 50;

export function useLoadMore<T>(
  items: T[],
  resetKey: string,
  pageSize = LOAD_MORE_SIZE,
) {
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [resetKey, pageSize]);

  return {
    items: items.slice(0, limit),
    total: items.length,
    hasMore: limit < items.length,
    loadMore: () => setLimit((current) => current + pageSize),
  };
}

export function LoadMoreButton({
  hasMore,
  onLoadMore,
}: {
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  if (!hasMore) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onLoadMore}
      className="mt-4 h-8 w-full rounded-md border border-border bg-background text-sm hover:bg-surface-2"
    >
      Load More
    </button>
  );
}
