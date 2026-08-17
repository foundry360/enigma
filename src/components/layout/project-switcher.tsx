"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { selectAccountAction } from "@/app/actions/accounts";
import {
  HeaderSwitcher,
  HeaderSwitcherAction,
  HeaderSwitcherItem,
} from "@/components/layout/header-switcher";
import { useCreateProject } from "@/components/projects/create-project-modal";
import { ProjectIcon } from "@/components/ui/entity-icons";

export type HeaderProject = {
  id: string;
  name: string;
  organizationId: string;
  status: string;
};

function switcherContext(pathname: string, projects: HeaderProject[]) {
  const orgMatch = pathname.match(/^\/accounts\/([^/]+)/);
  if (orgMatch?.[1] && orgMatch[1] !== "new") {
    return { organizationId: orgMatch[1], projectId: null };
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  if (projectMatch?.[1]) {
    const project = projects.find((item) => item.id === projectMatch[1]);
    if (project) {
      return {
        organizationId: project.organizationId,
        projectId: project.id,
      };
    }
  }

  return null;
}

export function SyncSelectedOrganization({
  projects,
  selectedAccountId,
}: {
  projects: HeaderProject[];
  selectedAccountId?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const organizationId =
    switcherContext(pathname, projects)?.organizationId ?? null;

  useEffect(() => {
    if (!organizationId || organizationId === selectedAccountId) {
      return;
    }

    startTransition(async () => {
      await selectAccountAction(organizationId);
      router.refresh();
    });
  }, [organizationId, selectedAccountId, router]);

  return null;
}

export function ProjectSwitcher({
  projects,
  selectedAccountId,
}: {
  projects: HeaderProject[];
  selectedAccountId?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openCreate } = useCreateProject();
  const [pending, startTransition] = useTransition();
  const context = switcherContext(pathname, projects);

  if (!context) {
    return null;
  }

  const organizationId = context.organizationId;
  const projectId = context.projectId;

  const orgProjects = projects.filter(
    (project) => project.organizationId === organizationId,
  );
  const selected =
    orgProjects.find((project) => project.id === projectId) ?? orgProjects[0];

  function selectProject(project: HeaderProject) {
    if (project.id === selected?.id || pending) {
      return;
    }

    startTransition(async () => {
      if (project.organizationId !== selectedAccountId) {
        await selectAccountAction(project.organizationId);
      }
      router.push(`/projects/${project.id}`);
    });
  }

  return (
    <>
      <span className="px-1 text-muted">/</span>
      <HeaderSwitcher
        ariaLabel="Switch project"
        icon={<ProjectIcon />}
        label={selected?.name ?? "Select project"}
        menuTitle="Projects"
        empty={
          <p className="px-2.5 py-1.5 text-sm text-muted">No projects yet</p>
        }
        footer={
          <HeaderSwitcherAction onSelect={() => openCreate(organizationId)}>
            Add project
          </HeaderSwitcherAction>
        }
      >
        {orgProjects.map((project) => (
          <HeaderSwitcherItem
            key={project.id}
            active={project.id === selected?.id}
            onSelect={() => selectProject(project)}
          >
            {project.name}
          </HeaderSwitcherItem>
        ))}
      </HeaderSwitcher>
    </>
  );
}
