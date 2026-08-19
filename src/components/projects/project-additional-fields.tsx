import { Field } from "@/components/ui/field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ProjectSection } from "@/components/projects/project-section";

export type ProjectAdditionalValues = {
  description?: string | null;
  businessUnit?: string | null;
  department?: string | null;
  executiveSponsor?: string | null;
  customerLead?: string | null;
  successMetrics?: string | null;
  notes?: string | null;
};

export function ProjectAdditionalFields({
  defaults,
  errors,
}: {
  defaults?: ProjectAdditionalValues;
  errors?: Record<string, string[] | undefined>;
}) {
  return (
    <ProjectSection title="Additional Details">
      <TextAreaField
        layout="horizontal"
        label="Description"
        name="description"
        defaultValue={defaults?.description ?? ""}
        rows={2}
        error={errors?.description}
      />
      <Field
        layout="horizontal"
        label="Business Unit"
        name="businessUnit"
        defaultValue={defaults?.businessUnit ?? ""}
        error={errors?.businessUnit}
      />
      <Field
        layout="horizontal"
        label="Department"
        name="department"
        defaultValue={defaults?.department ?? ""}
        error={errors?.department}
      />
      <Field
        layout="horizontal"
        label="Executive Sponsor"
        name="executiveSponsor"
        defaultValue={defaults?.executiveSponsor ?? ""}
        error={errors?.executiveSponsor}
      />
      <Field
        layout="horizontal"
        label="Customer Lead"
        name="customerLead"
        defaultValue={defaults?.customerLead ?? ""}
        error={errors?.customerLead}
      />
      <TextAreaField
        layout="horizontal"
        label="Success Metrics"
        name="successMetrics"
        defaultValue={defaults?.successMetrics ?? ""}
        rows={2}
        error={errors?.successMetrics}
      />
      <TextAreaField
        layout="horizontal"
        label="Notes"
        name="notes"
        defaultValue={defaults?.notes ?? ""}
        rows={2}
        error={errors?.notes}
      />
    </ProjectSection>
  );
}
