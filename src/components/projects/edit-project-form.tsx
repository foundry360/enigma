"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { updateProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ProjectAdditionalFields } from "@/components/projects/project-additional-fields";
import { ProjectEconomicsFields } from "@/components/projects/project-economics-fields";
import { ProjectSection } from "@/components/projects/project-section";
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

export function EditProjectForm({
  project,
  platforms,
  users,
  fromModal = false,
  onCancel,
  onSaved,
}: {
  fromModal?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
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
    implementationCost: number | null;
    discoveryCost: number | null;
    knowledgeCost: number | null;
    changeManagementCost: number | null;
    servicesCost: number | null;
    otherCost: number | null;
    annualVolume: number | null;
    unitPrice: number | null;
    hoursSavedPerUnit: number | null;
    hourlyCost: number | null;
    conservativeAdoption: number | null;
    expectedAdoption: number | null;
    aggressiveAdoption: number | null;
    baselineDays: number | null;
    enigmaDays: number | null;
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

  useEffect(() => {
    if (state?.ok) {
      onSaved?.();
    }
  }, [onSaved, state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="organizationId" value={project.organizationId} />
      {fromModal ? <input type="hidden" name="fromModal" value="1" /> : null}

      <ProjectSection title="Project" defaultOpen>
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
      </ProjectSection>
      <ProjectEconomicsFields defaults={project} errors={state?.errors} />

      <ProjectSection title="Ownership">
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
      </ProjectSection>

      <ProjectAdditionalFields
        defaults={project}
        errors={state?.errors}
      />

      {state?.message ? (
        <p className="text-sm text-accent">{state.message}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save project"}
        </Button>
      </div>
    </form>
  );
}
