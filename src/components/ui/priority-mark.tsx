export function PriorityMark({ priority }: { priority: string }) {
  const tone =
    priority === "High"
      ? "text-red-500"
      : priority === "Medium"
        ? "text-amber-400"
        : "text-muted";
  const icon =
    priority === "High" ? (
      <>
        <path d="m18 15-6-6-6 6" />
        <path d="m18 9-6-6-6 6" />
      </>
    ) : priority === "Low" ? (
      <>
        <path d="m6 9 6 6 6-6" />
        <path d="m6 15 6 6 6-6" />
      </>
    ) : (
      <path d="M5 12h14" />
    );

  return (
    <span title={`${priority} priority`} className={`shrink-0 ${tone}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon}
      </svg>
      <span className="sr-only">{priority} priority</span>
    </span>
  );
}
