"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createAccountAction } from "@/app/actions/accounts";
import { OrganizationProfileFields } from "@/components/accounts/organization-profile-fields";
import { Button, buttonClassName } from "@/components/ui/button";

const CreateOrganizationContext = createContext<{
  open: () => void;
  close: () => void;
} | null>(null);

export function useCreateOrganization() {
  const context = useContext(CreateOrganizationContext);
  if (!context) {
    throw new Error("useCreateOrganization must be used within the provider");
  }
  return context;
}

export function CreateOrganizationButton({
  children = (
    <>
      <span aria-hidden="true">+</span>
      New organization
    </>
  ),
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { open } = useCreateOrganization();
  return (
    <button
      type="button"
      className={className ?? buttonClassName("primary", "gap-1")}
      onClick={open}
    >
      {children}
    </button>
  );
}

export function CreateOrganizationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CreateOrganizationContext.Provider value={{ open, close }}>
      {children}
      <Suspense fallback={null}>
        <OpenFromQuery />
      </Suspense>
      {isOpen ? <CreateOrganizationModal onClose={close} /> : null}
    </CreateOrganizationContext.Provider>
  );
}

function OpenFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useCreateOrganization();

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }

    open();
    router.replace(pathname);
  }, [open, pathname, router, searchParams]);

  return null;
}

function CreateOrganizationModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [state, action, pending] = useActionState(
    createAccountAction,
    undefined,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-modal p-5 shadow-sm [&_input]:bg-modal [&_select]:bg-modal"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">
              New organization
            </h2>
            <p className="mt-1 text-sm text-muted">
              Create the customer enterprise. Platforms and environments attach
              later.
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-muted hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form action={action} className="space-y-4">
          <OrganizationProfileFields errors={state?.errors} />
          {state?.message ? (
            <p className="text-sm text-accent">{state.message}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create organization"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
