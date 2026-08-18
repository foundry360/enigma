import type { ReactNode } from "react";

export type CollectionView = "cards" | "list";

function ViewIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: CollectionView;
  onChange: (view: CollectionView) => void;
}) {
  return (
    <div className="inline-flex">
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-sm ${
          view === "cards"
            ? "bg-surface-2 text-foreground"
            : "text-muted hover:text-foreground"
        }`}
        aria-label="Card view"
        aria-pressed={view === "cards"}
        onClick={() => onChange("cards")}
      >
        <ViewIcon>
          <rect key="tl" width="7" height="7" x="3" y="3" rx="1" />
          <rect key="tr" width="7" height="7" x="14" y="3" rx="1" />
          <rect key="bl" width="7" height="7" x="3" y="14" rx="1" />
          <rect key="br" width="7" height="7" x="14" y="14" rx="1" />
        </ViewIcon>
      </button>
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-sm ${
          view === "list"
            ? "bg-surface-2 text-foreground"
            : "text-muted hover:text-foreground"
        }`}
        aria-label="List view"
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
      >
        <ViewIcon>
          <path key="l1" d="M8 6h13" />
          <path key="l2" d="M8 12h13" />
          <path key="l3" d="M8 18h13" />
          <path key="d1" d="M3 6h.01" />
          <path key="d2" d="M3 12h.01" />
          <path key="d3" d="M3 18h.01" />
        </ViewIcon>
      </button>
    </div>
  );
}
