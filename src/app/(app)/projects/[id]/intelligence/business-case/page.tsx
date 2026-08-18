import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCasePanel } from "@/components/intelligence/business-case-panel";
import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { buttonClassName } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { intelligenceHref } from "@/lib/intelligence/routes";
import { ensureBusinessCase } from "@/server/services/business-case";
import { getProjectOverview } from "@/server/services/projects";

export default async function IntelligenceBusinessCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const overview = await getProjectOverview(session.tenantId, id);

  if (!overview) {
    notFound();
  }

  const detail = await ensureBusinessCase(session.tenantId, id);

  return (
    <IntelligencePane scroll>
      {detail ? (
        <BusinessCasePanel projectId={id} detail={detail} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center rounded-lg border border-border bg-surface px-4 py-8 text-center">
          <p className="text-sm text-muted">
            Promote an opportunity to include it in the Business Case.
          </p>
          <Link
            href={intelligenceHref(id, "opportunities")}
            className={`${buttonClassName("secondary")} mt-4`}
          >
            Review opportunities
          </Link>
        </div>
      )}
    </IntelligencePane>
  );
}
