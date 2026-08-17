import { ProjectPlaceholderPage } from "@/components/projects/project-placeholder-page";

export default async function ProjectIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProjectPlaceholderPage
      projectId={id}
      title="Intelligence"
      description="Readiness, scoring, and explainable findings will appear here after discovery."
    />
  );
}
