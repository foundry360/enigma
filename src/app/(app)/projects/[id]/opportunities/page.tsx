import { redirect } from "next/navigation";
import { intelligenceHref } from "@/lib/intelligence/routes";

export default async function ProjectOpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ candidate?: string; opportunity?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  redirect(
    intelligenceHref(id, "opportunities", {
      candidate: query.candidate,
      opportunity: query.opportunity,
    }),
  );
}
