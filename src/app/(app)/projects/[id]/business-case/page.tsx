import { ProjectPlaceholderPage } from "@/components/projects/project-placeholder-page";

export default async function ProjectBusinessCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProjectPlaceholderPage
      projectId={id}
      title="Business Case"
      description="Consumption scenarios, ROC, and ROA are not built yet."
    />
  );
}
