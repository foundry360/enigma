"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import type { ProjectRow } from "@/lib/db/types";

export function EditProjectModal({
  project,
  platforms,
  users,
  onClose,
}: {
  project: ProjectRow;
  platforms: string[];
  users: { id: string; name: string }[];
  onClose: () => void;
}) {
  const titleId = useId();
  const router = useRouter();

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
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-modal p-5 shadow-sm [&_input]:bg-modal [&_select]:bg-modal [&_textarea]:bg-modal"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">
              Edit project
            </h2>
            <p className="mt-1 text-sm text-muted">
              Update the initiative, owner, investment, and scope.
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
        <EditProjectForm
          project={project}
          platforms={platforms}
          users={users}
          fromModal
          onCancel={onClose}
          onSaved={() => {
            router.refresh();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
