import { ProjectPlaceholderPage } from "@/components/projects/project-placeholder-page";

export default async function ProjectOutcomesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProjectPlaceholderPage
      projectId={id}
      title="Outcomes"
      description="Realized value and outcome tracking are not implemented yet."
    />
  );
}
