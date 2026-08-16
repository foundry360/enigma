"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectAccountAction } from "@/app/actions/accounts";
import { useCreateOrganization } from "@/components/accounts/create-organization-modal";

export function AccountSwitcher({
  accounts,
  selectedId,
}: {
  accounts: { id: string; name: string }[];
  selectedId?: string | null;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { open: openCreate } = useCreateOrganization();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const selected =
    accounts.find((account) => account.id === selectedId) ?? accounts[0];

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

  function selectAccount(accountId: string) {
    if (accountId === selected?.id || pending) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      await selectAccountAction(accountId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex max-w-56 items-center gap-[6.5px] rounded-md px-2 py-1 text-[13px] hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Switch organization"
        onClick={() => setOpen((value) => !value)}
      >
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
          className="shrink-0 text-muted"
        >
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
        <span className="truncate font-medium">
          {selected?.name ?? "Select organization"}
        </span>
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
          <p className="px-2.5 py-1.5 text-xs text-muted">Organizations</p>
          {accounts.length === 0 ? (
            <p className="px-2.5 py-1.5 text-sm text-muted">No organizations yet</p>
          ) : (
            accounts.map((account) => {
              const active = account.id === selected?.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  role="menuitem"
                  onClick={() => selectAccount(account.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
                    active
                      ? "bg-surface-2 text-foreground"
                      : "hover:bg-surface-2"
                  }`}
                >
                  <span className="truncate">{account.name}</span>
                  {active ? <span className="text-accent">✓</span> : null}
                </button>
              );
            })
          )}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2"
            onClick={() => {
              setOpen(false);
              openCreate();
            }}
          >
            Add organization
          </button>
        </div>
      ) : null}
    </div>
  );
}
