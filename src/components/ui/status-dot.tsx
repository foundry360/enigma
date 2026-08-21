const tones = {
  connected: "bg-connected",
  disconnected: "bg-red-500",
  idle: "bg-amber-400",
} as const;

const connectionTones: Record<string, keyof typeof tones> = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  EXPIRED: "disconnected",
  ERROR: "idle",
};

const connectionLabels: Record<string, string> = {
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  EXPIRED: "Expired",
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
  const color =
    tone === "connected"
      ? "bg-connected"
      : tone === "idle"
        ? "bg-amber-400"
        : "bg-red-500";

  return (
    <span
      title={label}
      className="inline-flex size-5 shrink-0 items-center justify-center"
    >
      <span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />
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
