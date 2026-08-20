export const intelligenceTabs = [
  { id: "overview", label: "Overview", path: "" },
  { id: "opportunities", label: "Opportunities", path: "/opportunities" },
  { id: "business-case", label: "Business Case", path: "/business-case" },
  { id: "deployment", label: "Forecast", path: "/deployment" },
  { id: "outcomes", label: "Outcomes", path: "/outcomes" },
] as const;

export type IntelligenceTab = (typeof intelligenceTabs)[number]["id"];

export function intelligenceHref(
  projectId: string,
  tab: IntelligenceTab = "overview",
  query?: Record<string, string | undefined>,
) {
  const entry = intelligenceTabs.find((item) => item.id === tab);
  const base = `/projects/${projectId}/intelligence${entry?.path ?? ""}`;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const search = params.toString();
  return search ? `${base}?${search}` : base;
}
