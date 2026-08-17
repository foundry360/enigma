import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { industries } from "@/lib/industries";
import {
  customerStatuses,
  employeeRanges,
  organizationTypes,
} from "@/lib/organizations";

export type OrganizationProfileValues = {
  name?: string;
  industry?: string | null;
  organizationType?: string | null;
  employeeRange?: string | null;
  primaryContact?: string | null;
  customerStatus?: string | null;
};

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

export function OrganizationProfileFields({
  defaults,
  errors,
  grouped = false,
}: {
  defaults?: OrganizationProfileValues;
  errors?: Record<string, string[] | undefined>;
  grouped?: boolean;
}) {
  const organization = (
    <>
      <Field
        layout="horizontal"
        label="Organization name"
        name="name"
        placeholder="Northern Peak Financial"
        defaultValue={defaults?.name}
        required
        error={errors?.name}
      />
      <SelectField
        layout="horizontal"
        label="Industry"
        name="industry"
        defaultValue={defaults?.industry ?? ""}
        error={errors?.industry}
      >
        <option value="">Select industry</option>
        {industries.map((industry) => (
          <option key={industry} value={industry}>
            {industry}
          </option>
        ))}
      </SelectField>
      <SelectField
        layout="horizontal"
        label="Organization type"
        name="organizationType"
        defaultValue={defaults?.organizationType ?? ""}
        error={errors?.organizationType}
      >
        <option value="">Select type</option>
        {organizationTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </SelectField>
      <SelectField
        layout="horizontal"
        label="Employee range"
        name="employeeRange"
        defaultValue={defaults?.employeeRange ?? ""}
        error={errors?.employeeRange}
      >
        <option value="">Select range</option>
        {employeeRanges.map((range) => (
          <option key={range} value={range}>
            {range}
          </option>
        ))}
      </SelectField>
    </>
  );

  const relationship = (
    <>
      <Field
        layout="horizontal"
        label="Primary contact"
        name="primaryContact"
        placeholder="Jane Rivera"
        defaultValue={defaults?.primaryContact ?? ""}
        error={errors?.primaryContact}
      />
      <SelectField
        layout="horizontal"
        label="Customer status"
        name="customerStatus"
        defaultValue={defaults?.customerStatus ?? ""}
        error={errors?.customerStatus}
      >
        <option value="">-</option>
        {customerStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </SelectField>
    </>
  );

  if (!grouped) {
    return (
      <>
        {organization}
        {relationship}
      </>
    );
  }

  return (
    <>
      <SettingsCard title="Organization">{organization}</SettingsCard>
      <SettingsCard title="Relationship">{relationship}</SettingsCard>
    </>
  );
}
