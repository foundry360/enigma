"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DateRange = {
  from: string;
  to: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDayKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShort(key: string) {
  const [year, month, day] = key.split("-");
  return `${pad(Number(month))}/${pad(Number(day))}/${year}`;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function rangeLabel(from: string, to: string) {
  if (from && to) {
    return from === to
      ? formatShort(from)
      : `${formatShort(from)} – ${formatShort(to)}`;
  }
  if (from) {
    return `${formatShort(from)} –`;
  }
  return "Date";
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: DateRange) => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [hover, setHover] = useState("");
  const active = Boolean(from || to);

  useEffect(() => {
    if (!open) {
      return;
    }

    const start = from ? parseDayKey(from) : new Date();
    setCursor({ year: start.getFullYear(), month: start.getMonth() });
    setHover("");

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, from]);

  function pick(day: string) {
    if (!from || to) {
      onChange({ from: day, to: "" });
      return;
    }

    onChange(day < from ? { from: day, to: from } : { from, to: day });
    setOpen(false);
  }

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const dayCount = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const todayKey = toDayKey(today);
  const previewEnd = to || hover;
  const rangeStart = from && previewEnd && previewEnd < from ? previewEnd : from;
  const rangeEnd = from && previewEnd && previewEnd < from ? from : previewEnd;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm ${
          active
            ? "border-border bg-surface-2 text-foreground"
            : "border-border bg-background text-muted hover:text-foreground"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
        {rangeLabel(from, to)}
      </button>
      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Date range"
          className="absolute right-0 top-full z-50 mt-1 w-[17.5rem] rounded-md border border-border bg-surface p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted hover:bg-surface-2 hover:text-foreground"
              aria-label="Previous month"
              onClick={() => setCursor((value) => shiftMonth(value.year, value.month, -1))}
            >
              <Chevron direction="left" />
            </button>
            <p className="text-sm font-medium">
              {monthLabel(cursor.year, cursor.month)}
            </p>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted hover:bg-surface-2 hover:text-foreground"
              aria-label="Next month"
              onClick={() => setCursor((value) => shiftMonth(value.year, value.month, 1))}
            >
              <Chevron direction="right" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-muted">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div
            className="grid grid-cols-7"
            onMouseLeave={() => setHover("")}
          >
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`pad-${index}`} />
            ))}
            {Array.from({ length: dayCount }, (_, index) => {
              const day = toDayKey(new Date(cursor.year, cursor.month, index + 1));
              const isStart = day === rangeStart;
              const isEnd = day === rangeEnd;
              const inRange =
                rangeStart &&
                rangeEnd &&
                day > rangeStart &&
                day < rangeEnd;
              const isToday = day === todayKey;

              return (
                <button
                  key={day}
                  type="button"
                  className={`h-8 text-sm ${
                    isStart || isEnd
                      ? "bg-accent text-accent-fg"
                      : inRange
                        ? "bg-surface-2 text-foreground"
                        : "text-foreground hover:bg-surface-2"
                  } ${isStart ? "rounded-l-md" : ""} ${isEnd ? "rounded-r-md" : ""} ${
                    isStart && isEnd ? "rounded-md" : ""
                  } ${isToday && !isStart && !isEnd ? "font-semibold" : ""}`}
                  onMouseEnter={() => setHover(day)}
                  onClick={() => pick(day)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          {active ? (
            <button
              type="button"
              className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-foreground"
              onClick={() => {
                onChange({ from: "", to: "" });
                setOpen(false);
              }}
            >
              Clear dates
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}
