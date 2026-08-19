import { notFound } from "next/navigation";
import { DeploymentPanel } from "@/components/intelligence/deployment-panel";
import { IntelligencePane } from "@/components/intelligence/intelligence-pane";
import { requireSession } from "@/lib/auth/session";
import { ensureBusinessCase } from "@/server/services/business-case";
import { getProjectOverview } from "@/server/services/projects";

export default async function IntelligenceDeploymentPage({
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
  const approved = detail?.businessCase.status === "approved";
  const ready = Boolean(
    detail && detail.rollup.complete && detail.gaps.length === 0,
  );

  return (
    <IntelligencePane>
      <DeploymentPanel projectId={id} approved={approved} ready={ready} />
    </IntelligencePane>
  );
}
