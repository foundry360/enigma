"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createProjectAction,
  getProjectForEditAction,
} from "@/app/actions/projects";
import { useCreateOrganization } from "@/components/accounts/create-organization-modal";
import { EditProjectModal } from "@/components/projects/edit-project-modal";
import { Button, buttonClassName } from "@/components/ui/button";
import type { ProjectRow } from "@/lib/db/types";
import { Field } from "@/components/ui/field";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ProjectAdditionalFields } from "@/components/projects/project-additional-fields";
import { ProjectEconomicsFields } from "@/components/projects/project-economics-fields";
import {
  ProjectSection,
  ProjectSections,
} from "@/components/projects/project-section";
import { platformLabel } from "@/lib/platforms";
import {
  DEFAULT_PROJECT_STATUS,
  primaryOutcomes,
  projectPriorities,
  projectStatuses,
  projectTypes,
  scopePlatforms,
} from "@/lib/projects";

type AccountChoice = { id: string; name: string };
type UserChoice = { id: string; name: string };

const CreateProjectContext = createContext<{
  open: (organizationId?: string) => void;
  openEdit: (projectId: string) => Promise<void>;
  close: () => void;
} | null>(null);

export function useCreateProject() {
  const context = useContext(CreateProjectContext);
  if (!context) {
    throw new Error("useCreateProject must be used within the provider");
  }
  return context;
}

export function EditProjectButton({
  projectId,
}: {
  projectId: string;
}) {
  const { openEdit } = useCreateProject();
  return (
    <button
      type="button"
      className={buttonClassName("primary")}
      onClick={() => void openEdit(projectId)}
    >
      Edit Project
    </button>
  );
}

export function CreateProjectButton({
  organizationId,
  children = (
    <>
      <span aria-hidden="true">+</span>
      New project
    </>
  ),
  className,
}: {
  organizationId?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { open } = useCreateProject();
  return (
    <button
      type="button"
      className={className ?? buttonClassName("primary", "gap-1")}
      onClick={() => open(organizationId)}
    >
      {children}
    </button>
  );
}

export function CreateProjectProvider({
  accounts,
  selectedAccountId,
  users,
  currentUserId,
  children,
}: {
  accounts: AccountChoice[];
  selectedAccountId?: string | null;
  users: UserChoice[];
  currentUserId: string;
  children: ReactNode;
}) {
  const { open: openOrganization } = useCreateOrganization();
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [edit, setEdit] = useState<{
    project: ProjectRow;
    platforms: string[];
  } | null>(null);

  const open = useCallback(
    (nextOrganizationId?: string) => {
      if (accounts.length === 0) {
        openOrganization();
        return;
      }

      setOrganizationId(nextOrganizationId);
      setIsOpen(true);
    },
    [accounts.length, openOrganization],
  );
  const openEdit = useCallback(async (projectId: string) => {
    const next = await getProjectForEditAction(projectId);
    if (next) {
      setEdit(next);
    }
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setEdit(null);
  }, []);

  return (
    <CreateProjectContext.Provider value={{ open, openEdit, close }}>
      {children}
      <Suspense fallback={null}>
        <OpenFromQuery />
      </Suspense>
      {isOpen ? (
        <CreateProjectModal
          accounts={accounts}
          selectedAccountId={organizationId ?? selectedAccountId}
          users={users}
          currentUserId={currentUserId}
          onClose={close}
        />
      ) : null}
      {edit ? (
        <EditProjectModal
          key={edit.project.id}
          project={edit.project}
          platforms={edit.platforms}
          users={users}
          onClose={close}
        />
      ) : null}
    </CreateProjectContext.Provider>
  );
}

function OpenFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useCreateProject();

  useEffect(() => {
    if (searchParams.get("newProject") !== "1") {
      return;
    }

    open(searchParams.get("organizationId") ?? undefined);
    router.replace(pathname);
  }, [open, pathname, router, searchParams]);

  return null;
}

function CreateProjectModal({
  accounts,
  selectedAccountId,
  users,
  currentUserId,
  onClose,
}: {
  accounts: AccountChoice[];
  selectedAccountId?: string | null;
  users: UserChoice[];
  currentUserId: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [state, action, pending] = useActionState(
    createProjectAction,
    undefined,
  );
  const [organizationId, setOrganizationId] = useState(
    selectedAccountId ?? "",
  );
  const [showOtherOutcome, setShowOtherOutcome] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-modal p-5 shadow-sm [&_input]:bg-modal [&_select]:bg-modal [&_textarea]:bg-modal"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">
              New project
            </h2>
            <p className="mt-1 text-sm text-muted">
              Define the initiative, owner, and scope. Discovery comes later.
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-muted hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form action={action} className="space-y-4">
          <ProjectSections>
          <ProjectSection title="Project">
            <Field
              layout="horizontal"
              label="Project Name"
              name="name"
              placeholder="Customer Service AI Transformation"
              required
              error={state?.errors?.name}
            />
            <SelectField
              layout="horizontal"
              label="Organization"
              name="organizationId"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              error={state?.errors?.organizationId}
            >
              <option value="">-</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              layout="horizontal"
              label="Project Type"
              name="projectType"
              defaultValue=""
              error={state?.errors?.projectType}
            >
              <option value="">-</option>
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              layout="horizontal"
              label="Objective"
              name="objective"
              placeholder="Identify opportunities to automate customer service operations."
              rows={2}
              error={state?.errors?.objective}
            />
            <MultiSelectField
              label="Desired Outcomes"
              name="outcomes"
              options={primaryOutcomes}
              error={state?.errors?.outcomes}
              onChange={(selected) =>
                setShowOtherOutcome(selected.includes("Other"))
              }
            />
            {showOtherOutcome ? (
              <Field
                layout="horizontal"
                label="Other Outcome"
                name="outcomeOther"
                placeholder="Describe the outcome"
                error={state?.errors?.outcomeOther}
              />
            ) : null}
            <SelectField
              layout="horizontal"
              label="Platform In Scope"
              name="platforms"
              defaultValue=""
              error={state?.errors?.platforms}
            >
              <option value="">-</option>
              {scopePlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platformLabel(platform)}
                </option>
              ))}
            </SelectField>
          </ProjectSection>
          <ProjectEconomicsFields assumptions={false} errors={state?.errors} />
          <ProjectSection title="Ownership">
            <SelectField
              layout="horizontal"
              label="Project Owner"
              name="ownerId"
              defaultValue={currentUserId}
              error={state?.errors?.ownerId}
            >
              <option value="">-</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              layout="horizontal"
              label="Status"
              name="status"
              defaultValue={DEFAULT_PROJECT_STATUS}
              error={state?.errors?.status}
            >
              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectField>
            <SelectField
              layout="horizontal"
              label="Priority"
              name="priority"
              defaultValue=""
              error={state?.errors?.priority}
            >
              <option value="">-</option>
              {projectPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </SelectField>
            <Field
              layout="horizontal"
              label="Target Date"
              name="targetDate"
              type="date"
              error={state?.errors?.targetDate}
            />
          </ProjectSection>
          <ProjectAdditionalFields errors={state?.errors} />
          </ProjectSections>

          {state?.message ? (
            <p className="text-sm text-accent">{state.message}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
