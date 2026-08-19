"use client";

import { useState } from "react";
import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function ProjectDangerZone({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) {
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName.trim() === name;

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Danger zone</h2>
      <section className="space-y-5 rounded-lg border border-red-500/30 bg-background p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Delete project</p>
            <p className="mt-1 text-sm text-muted">
              Permanently delete this project and its intelligence runs. Connected
              environments stay on the organization. Type {name} to confirm.
            </p>
            <form
              action={deleteProjectAction}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <div className="min-w-0 flex-1">
                <Field
                  label="Confirm Name"
                  name="confirmName"
                  placeholder={name}
                  value={confirmName}
                  onChange={(event) => setConfirmName(event.target.value)}
                />
              </div>
              <Button type="submit" variant="danger" disabled={!canDelete}>
                Delete
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
