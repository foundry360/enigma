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
import { createProjectAction } from "@/app/actions/projects";
import { useCreateOrganization } from "@/components/accounts/create-organization-modal";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/textarea-field";
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
type ConnectionChoice = {
  id: string;
  organizationId: string;
  platformType: string;
  status: string;
  externalOrgName: string | null;
};

const CreateProjectContext = createContext<{
  open: (organizationId?: string) => void;
  close: () => void;
} | null>(null);

export function useCreateProject() {
  const context = useContext(CreateProjectContext);
  if (!context) {
    throw new Error("useCreateProject must be used within the provider");
  }
  return context;
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
  connections,
  children,
}: {
  accounts: AccountChoice[];
  selectedAccountId?: string | null;
  users: UserChoice[];
  currentUserId: string;
  connections: ConnectionChoice[];
  children: ReactNode;
}) {
  const { open: openOrganization } = useCreateOrganization();
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(false);

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
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CreateProjectContext.Provider value={{ open, close }}>
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
          connections={connections}
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
  connections,
  onClose,
}: {
  accounts: AccountChoice[];
  selectedAccountId?: string | null;
  users: UserChoice[];
  currentUserId: string;
  connections: ConnectionChoice[];
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
  const orgConnections = connections.filter(
    (connection) => connection.organizationId === organizationId,
  );

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
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-modal p-5 shadow-sm [&_input]:bg-modal [&_select]:bg-modal [&_textarea]:bg-modal"
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
        <form action={action} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted">Project details</h3>
            <Field
              layout="horizontal"
              label="Project name"
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
              label="Project type"
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
              label="Desired outcomes"
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
                label="Other outcome"
                name="outcomeOther"
                placeholder="Describe the outcome"
                error={state?.errors?.outcomeOther}
              />
            ) : null}
            <SelectField
              layout="horizontal"
              label="Platform in scope"
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
          </section>

          {orgConnections.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted">Scope</h3>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">
                  Connected environments
                </legend>
                <div className="space-y-1.5">
                  {orgConnections.map((connection) => (
                    <label
                      key={connection.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="environmentIds"
                        value={connection.id}
                        className="accent-foreground"
                      />
                      {connection.externalOrgName ??
                        `${platformLabel(connection.platformType)} environment`}
                      <span className="text-xs text-muted">
                        {platformLabel(connection.platformType)} ·{" "}
                        {connection.status}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">Optional.</p>
              </fieldset>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted">Ownership</h3>
            <SelectField
              layout="horizontal"
              label="Project owner"
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
          </section>

          <details className="rounded-md border border-border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">
              Additional details
            </summary>
            <div className="mt-3 space-y-3">
              <TextAreaField
                layout="horizontal"
                label="Description"
                name="description"
                rows={2}
                error={state?.errors?.description}
              />
              <Field
                layout="horizontal"
                label="Business unit"
                name="businessUnit"
                error={state?.errors?.businessUnit}
              />
              <Field
                layout="horizontal"
                label="Department"
                name="department"
                error={state?.errors?.department}
              />
              <Field
                layout="horizontal"
                label="Executive sponsor"
                name="executiveSponsor"
                error={state?.errors?.executiveSponsor}
              />
              <Field
                layout="horizontal"
                label="Customer lead"
                name="customerLead"
                error={state?.errors?.customerLead}
              />
              <Field
                layout="horizontal"
                label="Target date"
                name="targetDate"
                type="date"
                error={state?.errors?.targetDate}
              />
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
              <TextAreaField
                layout="horizontal"
                label="Success metrics"
                name="successMetrics"
                rows={2}
                error={state?.errors?.successMetrics}
              />
              <TextAreaField
                layout="horizontal"
                label="Notes"
                name="notes"
                rows={2}
                error={state?.errors?.notes}
              />
            </div>
          </details>

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
