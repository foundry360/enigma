"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

const ProjectSectionContext = createContext<{
  openTitle: string | null;
  setOpenTitle: (title: string | null) => void;
} | null>(null);

export function ProjectSections({ children }: { children: ReactNode }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  return (
    <ProjectSectionContext.Provider value={{ openTitle, setOpenTitle }}>
      {children}
    </ProjectSectionContext.Provider>
  );
}

export function ProjectSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const group = useContext(ProjectSectionContext);
  const open = group?.openTitle === title;

  return (
    <details
      open={open}
      onToggle={(event) => {
        if (!group) {
          return;
        }

        if (event.currentTarget.open) {
          group.setOpenTitle(title);
          return;
        }

        if (group.openTitle === title) {
          group.setOpenTitle(null);
        }
      }}
      className="border-t border-border pt-4 first:border-t-0 first:pt-0"
    >
      <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
        {title}
      </summary>
      <div className="mt-3 space-y-3 pl-5">
        {description ? (
          <p className="text-sm text-muted">{description}</p>
        ) : null}
        {children}
      </div>
    </details>
  );
}
