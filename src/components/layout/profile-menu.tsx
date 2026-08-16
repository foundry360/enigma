"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/avatar";

export function ProfileMenu({
  userName,
  tenantName,
  avatarUrl,
}: {
  userName: string;
  tenantName: string;
  avatarUrl?: string | null;
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
        className="rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={userName} src={avatarUrl} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-border bg-surface p-1 shadow-sm"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted">{tenantName}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <Link
            href="/settings"
            role="menuitem"
            className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
