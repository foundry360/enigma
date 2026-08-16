import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function AssessmentsPage() {
  return (
    <>
      <PageHeader
        title="Assessments"
        description="Readiness, opportunities, consumption, value, ROC, ROA, and roadmap."
      />
      <EmptyState
        title="Assessments start after Salesforce discovery"
        body="Sprint 2 connects a Developer Org and stores a metadata-first snapshot. Sprint 3 turns that snapshot into explainable scores."
        action={
          <Link href="/accounts" className={buttonClassName("secondary")}>
            Prepare an account
          </Link>
        }
      />
    </>
  );
}
