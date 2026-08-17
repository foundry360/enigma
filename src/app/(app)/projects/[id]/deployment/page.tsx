import { ProjectPlaceholderPage } from "@/components/projects/project-placeholder-page";

export default async function ProjectDeploymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProjectPlaceholderPage
      projectId={id}
      title="Deployment"
      description="Roadmap and rollout tracking are not implemented yet."
    />
  );
}
