"use client";

import { useState } from "react";
import {
  deleteOrganizationAction,
  disableOrganizationAction,
} from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function OrganizationDangerZone({
  organizationId,
  name,
  disabled,
}: {
  organizationId: string;
  name: string;
  disabled: boolean;
}) {
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName.trim() === name;

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Danger zone</h2>
      <section className="space-y-5 rounded-lg border border-red-500/30 bg-background p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {disabled ? "Enable organization" : "Disable organization"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {disabled
                ? "This organization is disabled. Enable it to use it in the workspace again."
                : "Disable this organization to keep its records without using it in the workspace."}
            </p>
          </div>
          <form action={disableOrganizationAction}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <input
              type="hidden"
              name="disabled"
              value={disabled ? "false" : "true"}
            />
            <Button type="submit" variant="danger">
              {disabled ? "Enable" : "Disable"}
            </Button>
          </form>
        </div>

        <div className="border-t border-red-500/20" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Delete organization</p>
            <p className="mt-1 text-sm text-muted">
              Permanently delete this organization, its projects, connections,
              and assessments. Type {name} to confirm.
            </p>
            <form
              action={deleteOrganizationAction}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <input
                type="hidden"
                name="organizationId"
                value={organizationId}
              />
              <div className="min-w-0 flex-1">
                <Field
                  label="Confirm name"
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
