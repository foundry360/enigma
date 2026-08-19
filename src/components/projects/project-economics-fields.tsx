import { Field } from "@/components/ui/field";
import { ProjectSection } from "@/components/projects/project-section";

export type ProjectEconomicsValues = {
  discoveryCost?: number | null;
  implementationCost?: number | null;
  knowledgeCost?: number | null;
  changeManagementCost?: number | null;
  servicesCost?: number | null;
  otherCost?: number | null;
  annualVolume?: number | null;
  unitPrice?: number | null;
  hoursSavedPerUnit?: number | null;
  hourlyCost?: number | null;
  conservativeAdoption?: number | null;
  expectedAdoption?: number | null;
  aggressiveAdoption?: number | null;
  baselineDays?: number | null;
  enigmaDays?: number | null;
};

function numberValue(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function percentValue(value: number | null | undefined) {
  return value == null ? "" : String(Math.round(value * 100));
}

export function ProjectEconomicsFields({
  defaults,
  errors,
  assumptions = true,
}: {
  defaults?: ProjectEconomicsValues;
  errors?: Record<string, string[] | undefined>;
  assumptions?: boolean;
}) {
  return (
    <>
      <ProjectSection title="Investment">
        <Field
          layout="horizontal"
          label="Discovery"
          name="discoveryCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.discoveryCost)}
          error={errors?.discoveryCost}
        />
        <Field
          layout="horizontal"
          label="Implementation"
          name="implementationCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.implementationCost)}
          error={errors?.implementationCost}
        />
        <Field
          layout="horizontal"
          label="Knowledge"
          name="knowledgeCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.knowledgeCost)}
          error={errors?.knowledgeCost}
        />
        <Field
          layout="horizontal"
          label="Change Management"
          name="changeManagementCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.changeManagementCost)}
          error={errors?.changeManagementCost}
        />
        <Field
          layout="horizontal"
          label="Services"
          name="servicesCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.servicesCost)}
          error={errors?.servicesCost}
        />
        <Field
          layout="horizontal"
          label="Other"
          name="otherCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.otherCost)}
          error={errors?.otherCost}
        />
      </ProjectSection>
      {assumptions ? (
      <ProjectSection
        title="Assumptions"
        description="Start with what you know. We’ll calculate the rest."
      >
        <Field
          layout="horizontal"
          label="Work Per Year"
          hint="How many cases, chats, tickets, or other interactions occur in a typical year?"
          name="annualVolume"
          type="number"
          min={0}
          step="1"
          placeholder="e.g. 12000"
          defaultValue={numberValue(defaults?.annualVolume)}
          error={errors?.annualVolume}
        />
        <Field
          layout="horizontal"
          label="Work Item Cost"
          hint="What do you pay each time this happens? We’ll use this to forecast consumption."
          name="unitPrice"
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 1.25"
          defaultValue={numberValue(defaults?.unitPrice)}
          error={errors?.unitPrice}
        />
        <Field
          layout="horizontal"
          label="Hours On Work Item"
          hint="How long does it typically take to handle one work item manually? Enter hours (15 minutes = 0.25)."
          name="hoursSavedPerUnit"
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 0.5"
          defaultValue={numberValue(defaults?.hoursSavedPerUnit)}
          error={errors?.hoursSavedPerUnit}
        />
        <Field
          layout="horizontal"
          label="Labor Cost / Hour"
          hint="What is the approximate hourly cost of the people who handle this work? A ballpark estimate is fine."
          name="hourlyCost"
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 85"
          defaultValue={numberValue(defaults?.hourlyCost)}
          error={errors?.hourlyCost}
        />
        <Field
          layout="horizontal"
          label="Conservative Share %"
          hint="What percentage of this work could an agent realistically handle, even if it isn't fully automated?"
          name="conservativeAdoption"
          type="number"
          min={0}
          max={100}
          step="1"
          placeholder="e.g. 10"
          defaultValue={percentValue(defaults?.conservativeAdoption)}
          error={errors?.conservativeAdoption}
        />
        <Field
          layout="horizontal"
          label="Expected Share %"
          hint="Based on your experience, what percentage would you realistically expect an agent to handle?"
          name="expectedAdoption"
          type="number"
          min={0}
          max={100}
          step="1"
          placeholder="e.g. 20"
          defaultValue={percentValue(defaults?.expectedAdoption)}
          error={errors?.expectedAdoption}
        />
        <Field
          layout="horizontal"
          label="Aggressive Share %"
          hint="If things go well, what percentage of this work could an agent realistically handle?"
          name="aggressiveAdoption"
          type="number"
          min={0}
          max={100}
          step="1"
          placeholder="e.g. 30"
          defaultValue={percentValue(defaults?.aggressiveAdoption)}
          error={errors?.aggressiveAdoption}
        />
        <Field
          layout="horizontal"
          label="Days Without Enigma"
          hint="If your team handled the implementation themselves, how long would it take to go live?"
          name="baselineDays"
          type="number"
          min={0}
          step="1"
          placeholder="e.g. 180"
          defaultValue={numberValue(defaults?.baselineDays)}
          error={errors?.baselineDays}
        />
        <Field
          layout="horizontal"
          label="Days With Enigma"
          hint="How quickly could you go live with our help?"
          name="enigmaDays"
          type="number"
          min={0}
          step="1"
          placeholder="e.g. 60"
          defaultValue={numberValue(defaults?.enigmaDays)}
          error={errors?.enigmaDays}
        />
      </ProjectSection>
      ) : null}
    </>
  );
}
