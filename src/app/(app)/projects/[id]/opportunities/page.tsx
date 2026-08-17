import { ProjectPlaceholderPage } from "@/components/projects/project-placeholder-page";

export default async function ProjectOpportunitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProjectPlaceholderPage
      projectId={id}
      title="Opportunities"
      description="Detected opportunities will appear here after intelligence runs."
    />
  );
}
