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
}: {
  defaults?: ProjectEconomicsValues;
  errors?: Record<string, string[] | undefined>;
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
          label="Change management"
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
      <ProjectSection title="Assumptions">
        <Field
          layout="horizontal"
          label="Annual volume"
          name="annualVolume"
          type="number"
          min={0}
          step="1"
          defaultValue={numberValue(defaults?.annualVolume)}
          error={errors?.annualVolume}
        />
        <Field
          layout="horizontal"
          label="Cost per unit"
          name="unitPrice"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.unitPrice)}
          hint="Working unit cost. Not official Salesforce pricing."
          error={errors?.unitPrice}
        />
        <Field
          layout="horizontal"
          label="Hours saved / unit"
          name="hoursSavedPerUnit"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.hoursSavedPerUnit)}
          error={errors?.hoursSavedPerUnit}
        />
        <Field
          layout="horizontal"
          label="Hourly labor cost"
          name="hourlyCost"
          type="number"
          min={0}
          step="any"
          defaultValue={numberValue(defaults?.hourlyCost)}
          error={errors?.hourlyCost}
        />
        <Field
          layout="horizontal"
          label="Conservative adoption %"
          name="conservativeAdoption"
          type="number"
          min={0}
          max={100}
          step="1"
          defaultValue={percentValue(defaults?.conservativeAdoption)}
          error={errors?.conservativeAdoption}
        />
        <Field
          layout="horizontal"
          label="Expected adoption %"
          name="expectedAdoption"
          type="number"
          min={0}
          max={100}
          step="1"
          defaultValue={percentValue(defaults?.expectedAdoption)}
          error={errors?.expectedAdoption}
        />
        <Field
          layout="horizontal"
          label="Aggressive adoption %"
          name="aggressiveAdoption"
          type="number"
          min={0}
          max={100}
          step="1"
          defaultValue={percentValue(defaults?.aggressiveAdoption)}
          error={errors?.aggressiveAdoption}
        />
        <Field
          layout="horizontal"
          label="Baseline days"
          name="baselineDays"
          type="number"
          min={0}
          step="1"
          defaultValue={numberValue(defaults?.baselineDays)}
          error={errors?.baselineDays}
        />
        <Field
          layout="horizontal"
          label="Enigma-assisted days"
          name="enigmaDays"
          type="number"
          min={0}
          step="1"
          defaultValue={numberValue(defaults?.enigmaDays)}
          error={errors?.enigmaDays}
        />
      </ProjectSection>
    </>
  );
}
