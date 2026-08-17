"use client";

import { useState, type ReactNode } from "react";
import { useActionState } from "react";
import { updateProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { dateInputValue } from "@/lib/format";
import { platformLabel } from "@/lib/platforms";
import {
  asOutcomeList,
  primaryOutcomes,
  projectPriorities,
  projectStatuses,
  projectTypes,
  scopePlatforms,
} from "@/lib/projects";

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <section className="rounded-lg border border-border bg-background p-5">
        <div className="space-y-4">{children}</div>
      </section>
    </div>
  );
}

export function EditProjectForm({
  project,
  platforms,
  users,
}: {
  project: {
    id: string;
    organizationId: string;
    name: string;
    projectType: string;
    objective: string;
    outcomes: unknown;
    outcomeOther: string | null;
    ownerId: string | null;
    status: string;
    platformType: string | null;
    description: string | null;
    businessUnit: string | null;
    department: string | null;
    executiveSponsor: string | null;
    customerLead: string | null;
    targetDate: Date | string | null;
    priority: string | null;
    successMetrics: string | null;
    notes: string | null;
  };
  platforms: string[];
  users: { id: string; name: string }[];
}) {
  const outcomes = asOutcomeList(project.outcomes).filter((outcome) =>
    (primaryOutcomes as readonly string[]).includes(outcome),
  );
  const [state, action, pending] = useActionState(
    updateProjectAction,
    undefined,
  );
  const [showOtherOutcome, setShowOtherOutcome] = useState(
    outcomes.includes("Other"),
  );
  const selectedPlatform = platforms[0] ?? project.platformType ?? "";

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="organizationId" value={project.organizationId} />

      <SettingsCard title="Project">
        <Field
          layout="horizontal"
          label="Project name"
          name="name"
          defaultValue={project.name}
          required
          error={state?.errors?.name}
        />
        <SelectField
          layout="horizontal"
          label="Project type"
          name="projectType"
          defaultValue={project.projectType}
          error={state?.errors?.projectType}
        >
          <option value="">-</option>
          {projectTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          layout="horizontal"
          label="Objective"
          name="objective"
          defaultValue={project.objective}
          rows={2}
          error={state?.errors?.objective}
        />
        <MultiSelectField
          label="Desired outcomes"
          name="outcomes"
          options={primaryOutcomes}
          defaultSelected={outcomes}
          error={state?.errors?.outcomes}
          onChange={(selected) => setShowOtherOutcome(selected.includes("Other"))}
        />
        {showOtherOutcome ? (
          <Field
            layout="horizontal"
            label="Other outcome"
            name="outcomeOther"
            defaultValue={project.outcomeOther ?? ""}
            error={state?.errors?.outcomeOther}
          />
        ) : null}
        <SelectField
          layout="horizontal"
          label="Platform in scope"
          name="platforms"
          defaultValue={selectedPlatform}
          error={state?.errors?.platforms}
        >
          <option value="">-</option>
          {scopePlatforms.map((platform) => (
            <option key={platform} value={platform}>
              {platformLabel(platform)}
            </option>
          ))}
        </SelectField>
      </SettingsCard>

      <SettingsCard title="Ownership">
        <SelectField
          layout="horizontal"
          label="Project owner"
          name="ownerId"
          defaultValue={project.ownerId ?? ""}
          error={state?.errors?.ownerId}
        >
          <option value="">-</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          layout="horizontal"
          label="Status"
          name="status"
          defaultValue={project.status}
          error={state?.errors?.status}
        >
          {projectStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </SelectField>
        <SelectField
          layout="horizontal"
          label="Priority"
          name="priority"
          defaultValue={project.priority ?? ""}
          error={state?.errors?.priority}
        >
          <option value="">-</option>
          {projectPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </SelectField>
        <Field
          layout="horizontal"
          label="Target date"
          name="targetDate"
          type="date"
          defaultValue={dateInputValue(project.targetDate)}
          error={state?.errors?.targetDate}
        />
      </SettingsCard>

      <SettingsCard title="Additional details">
        <TextAreaField
          layout="horizontal"
          label="Description"
          name="description"
          defaultValue={project.description ?? ""}
          rows={2}
          error={state?.errors?.description}
        />
        <Field
          layout="horizontal"
          label="Business unit"
          name="businessUnit"
          defaultValue={project.businessUnit ?? ""}
          error={state?.errors?.businessUnit}
        />
        <Field
          layout="horizontal"
          label="Department"
          name="department"
          defaultValue={project.department ?? ""}
          error={state?.errors?.department}
        />
        <Field
          layout="horizontal"
          label="Executive sponsor"
          name="executiveSponsor"
          defaultValue={project.executiveSponsor ?? ""}
          error={state?.errors?.executiveSponsor}
        />
        <Field
          layout="horizontal"
          label="Customer lead"
          name="customerLead"
          defaultValue={project.customerLead ?? ""}
          error={state?.errors?.customerLead}
        />
        <TextAreaField
          layout="horizontal"
          label="Success metrics"
          name="successMetrics"
          defaultValue={project.successMetrics ?? ""}
          rows={2}
          error={state?.errors?.successMetrics}
        />
        <TextAreaField
          layout="horizontal"
          label="Notes"
          name="notes"
          defaultValue={project.notes ?? ""}
          rows={2}
          error={state?.errors?.notes}
        />
      </SettingsCard>

      {state?.message ? (
        <p className="text-sm text-accent">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save project"}
        </Button>
      </div>
    </form>
  );
}
