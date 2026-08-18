import { sql } from "@/lib/db/sql";
import { platformLabel } from "@/lib/platforms";
import type { SearchHit, SearchResults } from "@/lib/search";
import { requireTenantId } from "@/lib/tenants/scope";

export type { SearchHit, SearchResults };

function likePattern(query: string) {
  const safe = query.trim().replace(/[%_\\]/g, "");
  return safe ? `%${safe}%` : "";
}

function assessmentLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export async function searchWorkspace(
  tenantId: string,
  query: string,
): Promise<SearchResults> {
  const scoped = requireTenantId(tenantId);
  const pattern = likePattern(query);

  if (!pattern) {
    return { organizations: [], projects: [], assessments: [] };
  }

  const [organizations, projects, assessments] = await Promise.all([
    sql<
      {
        id: string;
        name: string;
        industry: string | null;
        customerStatus: string | null;
      }[]
    >`
      select id, name, industry, "customerStatus"
      from "Organization"
      where "tenantId" = ${scoped}
        and (
          name ilike ${pattern}
          or coalesce(industry, '') ilike ${pattern}
          or coalesce("organizationType", '') ilike ${pattern}
          or coalesce("primaryContact", '') ilike ${pattern}
          or coalesce("customerStatus", '') ilike ${pattern}
        )
      order by "updatedAt" desc
      limit 6
    `,
    sql<
      {
        id: string;
        name: string;
        platformType: string | null;
        projectType: string;
        organizationName: string;
      }[]
    >`
      select
        p.id,
        p.name,
        p."platformType",
        p."projectType",
        o.name as "organizationName"
      from "Project" p
      join "Organization" o
        on o.id = p."organizationId" and o."tenantId" = p."tenantId"
      where p."tenantId" = ${scoped}
        and (
          p.name ilike ${pattern}
          or coalesce(p."platformType", '') ilike ${pattern}
          or p."projectType" ilike ${pattern}
          or p.objective ilike ${pattern}
          or o.name ilike ${pattern}
        )
      order by p."updatedAt" desc
      limit 6
    `,
    sql<
      {
        id: string;
        status: string;
        organizationId: string;
        projectId: string | null;
        organizationName: string;
      }[]
    >`
      select
        a.id,
        a.status,
        a."organizationId",
        a."projectId",
        o.name as "organizationName"
      from "Assessment" a
      join "Organization" o
        on o.id = a."organizationId" and o."tenantId" = a."tenantId"
      where a."tenantId" = ${scoped}
        and (
          a.status ilike ${pattern}
          or o.name ilike ${pattern}
        )
      order by a."updatedAt" desc
      limit 6
    `,
  ]);

  return {
    organizations: organizations.map((organization) => ({
      id: organization.id,
      type: "organization",
      title: organization.name,
      subtitle: [organization.industry, organization.customerStatus]
        .filter(Boolean)
        .join(" · ") || "Organization",
      href: `/accounts/${organization.id}`,
    })),
    projects: projects.map((project) => ({
      id: project.id,
      type: "project",
      title: project.name,
      subtitle: `${project.projectType} · ${project.organizationName}`,
      href: `/projects/${project.id}`,
    })),
    assessments: assessments.map((assessment) => ({
      id: assessment.id,
      type: "assessment",
      title: `${assessmentLabel(assessment.status)} run`,
      subtitle: assessment.organizationName,
      href: assessment.projectId
        ? `/projects/${assessment.projectId}/intelligence?assessment=${assessment.id}`
        : `/accounts/${assessment.organizationId}/assessments`,
    })),
  };
}
