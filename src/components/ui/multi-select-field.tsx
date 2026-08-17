"use client";

import { useEffect, useId, useRef, useState } from "react";

export function MultiSelectField({
  label,
  name,
  options,
  error,
  placeholder = "-",
  defaultSelected = [],
  onChange,
}: {
  label: string;
  name: string;
  options: readonly string[];
  error?: string[] | string;
  placeholder?: string;
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function toggle(option: string) {
    setSelected((current) => {
      const next = current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option];
      onChange?.(next);
      return next;
    });
  }

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.join(", ")
        : `${selected.length} selected`;

  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-start gap-x-3">
      <label htmlFor={inputId} className="pt-2 text-sm font-medium">
        {label}
      </label>
      <div ref={rootRef} className="relative">
        {selected.map((value) => (
          <input key={value} type="hidden" name={name} value={value} />
        ))}
        <button
          id={inputId}
          type="button"
          className={`flex h-9 w-full items-center justify-between rounded-md border bg-modal px-2.5 text-left text-sm outline-none ${
            message
              ? "border-accent focus:border-foreground"
              : "border-border focus:border-foreground"
          } ${selected.length === 0 ? "text-placeholder" : "text-foreground"}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="truncate">{summary}</span>
          <span className="text-muted">▾</span>
        </button>
        {open ? (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-modal p-1 shadow-sm"
          >
            {options.map((option) => {
              const active = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
                    active ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                  onClick={() => toggle(option)}
                >
                  {option}
                  {active ? <span className="text-muted">✓</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        {message ? (
          <div className="mt-1.5 text-xs text-accent">{message}</div>
        ) : null}
      </div>
    </div>
  );
}
