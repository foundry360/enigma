"use client";

import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function HeaderSwitcher({
  ariaLabel,
  icon,
  label,
  menuTitle,
  empty,
  children,
  footer,
}: {
  ariaLabel: string;
  icon: ReactNode;
  label: string;
  menuTitle: string;
  empty?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex max-w-56 items-center gap-[6.5px] rounded-md px-2 py-1 text-[13px] hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
        <span className="truncate font-medium">{label}</span>
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
          className="shrink-0 text-muted"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-surface p-1 shadow-sm"
        >
          <p className="px-2.5 py-1.5 text-xs text-muted">{menuTitle}</p>
          <div onClick={() => setOpen(false)}>
            {Children.count(children) > 0 ? children : empty}
          </div>
          {footer ? (
            <>
              <div className="my-1 border-t border-border" />
              <div onClick={() => setOpen(false)}>{footer}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HeaderSwitcherItem({
  active,
  children,
  onSelect,
}: {
  active?: boolean;
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
        active ? "bg-surface-2 text-foreground" : "hover:bg-surface-2"
      }`}
    >
      <span className="truncate">{children}</span>
      {active ? <span className="text-accent">✓</span> : null}
    </button>
  );
}

export function HeaderSwitcherAction({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2"
      onClick={onSelect}
    >
      {children}
    </button>
  );
}
