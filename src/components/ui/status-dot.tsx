const tones = {
  connected: "bg-connected",
  disconnected: "bg-red-500",
  idle: "bg-amber-400",
} as const;

const connectionTones: Record<string, keyof typeof tones> = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "idle",
};

const connectionLabels: Record<string, string> = {
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  ERROR: "Idle",
};

export function StatusDot({
  tone = "disconnected",
}: {
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${tones[tone]}`}
    />
  );
}

export function connectionTone(status: string | null | undefined) {
  return connectionTones[status ?? ""] ?? "disconnected";
}

export function connectionLabel(status: string | null | undefined) {
  return connectionLabels[status ?? ""] ?? "Disconnected";
}

export function ConnectionStatusMark({
  status,
}: {
  status: string | null | undefined;
}) {
  const tone = connectionTone(status);
  const label = connectionLabel(status);
  const icon =
    tone === "connected" ? (
      <path d="m8 12 2.5 2.5L16 9" />
    ) : tone === "idle" ? (
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    ) : (
      <>
        <path d="M9 9 15 15" />
        <path d="M15 9 9 15" />
      </>
    );

  return (
    <span
      title={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        tone === "connected"
          ? "border-connected text-connected"
          : tone === "idle"
            ? "border-amber-400 text-amber-400"
            : "border-red-500/70 text-red-500"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
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
      <span className="sr-only">{label}</span>
    </span>
  );
}

const projectDot: Record<string, string> = {
  Planning: "#0284c7",
  Active: "#3ECF8E",
  "On hold": "#F5C542",
  Complete: "#3ECF8E",
};

export function ProjectStatusMark({ status }: { status: string }) {
  const color = projectDot[status] ?? "#0284c7";

  return (
    <span title={status} className="inline-flex shrink-0 items-center">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="sr-only">{status}</span>
    </span>
  );
}

const assessmentLabels: Record<string, string> = {
  DRAFT: "Draft",
  DISCOVERING: "Discovering",
  ANALYZING: "Analyzing",
  COMPLETE: "Complete",
  FAILED: "Failed",
};

export function assessmentLabel(status: string) {
  return (
    assessmentLabels[status] ??
    status.charAt(0) + status.slice(1).toLowerCase()
  );
}

const assessmentDot: Record<string, string> = {
  COMPLETE: "#3ECF8E",
  DISCOVERING: "#F5C542",
  ANALYZING: "#F5C542",
  DRAFT: "#F5C542",
  FAILED: "#F16A50",
};

export function AssessmentStatusMark({ status }: { status: string }) {
  const label = assessmentLabel(status);
  const color = assessmentDot[status] ?? "#F5C542";

  return (
    <span title={label} className="inline-flex shrink-0 items-center">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
