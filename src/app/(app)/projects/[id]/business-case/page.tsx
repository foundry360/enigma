import { redirect } from "next/navigation";
import { intelligenceHref } from "@/lib/intelligence/routes";

export default async function ProjectBusinessCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(intelligenceHref(id, "business-case"));
}
