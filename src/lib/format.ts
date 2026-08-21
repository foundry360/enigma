export function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function serializeDate(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function dateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function toUtcDate(value: Date | string) {
  const date =
    value instanceof Date
      ? value
      : parseTimestamp(value.trim());

  if (date.getTime() > Date.now() + 60_000) {
    return new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
      ),
    );
  }

  return date;
}

function parseTimestamp(value: string) {
  if (/(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(value) || value.includes("T")) {
    return new Date(value.replace(" ", "T"));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`);
  }

  return new Date(`${value.replace(" ", "T")}Z`);
}

function padDatePart(value: number | string) {
  return String(value).padStart(2, "0");
}

function civilDate(value: Date | string) {
  const raw =
    value instanceof Date ? value.toISOString() : value.trim();
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return { year: iso[1], month: iso[2], day: iso[3] };
  }

  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\b|$)/);
  if (mdy) {
    return {
      month: padDatePart(mdy[1]),
      day: padDatePart(mdy[2]),
      year: mdy[3],
    };
  }

  const date = value instanceof Date ? value : parseTimestamp(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    year: String(date.getUTCFullYear()),
    month: padDatePart(date.getUTCMonth() + 1),
    day: padDatePart(date.getUTCDate()),
  };
}

export function formatDate(value: Date | string) {
  const parts = civilDate(value);
  if (!parts) {
    return "—";
  }

  return `${parts.month}/${parts.day}/${parts.year}`;
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  return formatDate(value);
}

export function formatTimeAgo(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = toUtcDate(value);
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return minutes === 1 ? "1 min ago" : `${minutes} mins ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const weeks = Math.round(days / 7);
  if (weeks < 5) {
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  const months = Math.round(days / 30);
  if (months < 12) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.round(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number | null | undefined) {
  return formatCurrency(value);
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrencyPrecise(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMultiple(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}x`;
}

export function formatMonths(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)} mo`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatLastActivity(value: Date | string | null) {
  if (!value) {
    return "No activity yet";
  }

  return formatDate(value);
}
