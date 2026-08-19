"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useCreateProject } from "@/components/projects/create-project-modal";
import { DeleteProjectModal } from "@/components/projects/delete-project-modal";

export function ProjectRowMenu({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { openEdit } = useCreateProject();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Actions for ${name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <ThreeDotsIcon />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 w-36 rounded-md border border-border bg-surface p-1 shadow-sm"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2"
            onClick={() => {
              setOpen(false);
              void openEdit(projectId);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-md px-2.5 py-1.5 text-left text-sm text-red-500 hover:bg-red-500/10"
            onClick={() => {
              setOpen(false);
              setDeleteOpen(true);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
      {deleteOpen ? (
        <DeleteProjectModal
          projectId={projectId}
          name={name}
          onClose={() => setDeleteOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ThreeDotsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  );
}
