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
      description="Realized consumption versus forecast will land here after the model exists."
    />
  );
}
