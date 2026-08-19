"use client";

import { useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function DeleteProjectModal({
  projectId,
  name,
  onClose,
}: {
  projectId: string;
  name: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const pathname = usePathname();
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName.trim() === name;

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
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-modal p-5 shadow-sm [&_input]:bg-modal"
      >
        <h2 id={titleId} className="text-sm font-semibold">
          Delete project
        </h2>
        <p className="mt-2 text-sm text-muted">
          This permanently deletes {name} and its intelligence runs. Connected
          environments stay on the organization. Type the project name to
          confirm.
        </p>
        <form action={deleteProjectAction} className="mt-4 space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnTo" value={pathname} />
          <Field
            label="Project name"
            name="confirmName"
            placeholder={name}
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!canDelete}
              onClick={onClose}
            >
              Cancel
            </Button>
            <DeleteButton disabled={!canDelete} />
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={disabled || pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
