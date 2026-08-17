export type SearchHit = {
  id: string;
  type: "organization" | "project" | "assessment";
  title: string;
  subtitle: string;
  href: string;
};

export type SearchResults = {
  organizations: SearchHit[];
  projects: SearchHit[];
  assessments: SearchHit[];
};
