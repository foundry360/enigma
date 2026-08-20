"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { startDiscoveryAction } from "@/app/actions/assessments";
import { Button } from "@/components/ui/button";
import { intelligenceHref } from "@/lib/intelligence/routes";
import {
  advanceRunProgress,
  initialRunProgress,
  progressForStage,
  type IntelligenceRunProgress,
} from "@/modules/intelligence/run-progress";

const completePauseMs = 1200;

export function AssessmentRunForm({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState<IntelligenceRunProgress>(
    initialRunProgress,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active) {
      return;
    }

    setActive(true);
    setProgress(initialRunProgress());
    const formData = new FormData(event.currentTarget);

    try {
      await startDiscoveryAction(formData);
      setProgress(progressForStage("save", true));
      await new Promise((resolve) => window.setTimeout(resolve, completePauseMs));
      const overview = intelligenceHref(projectId);
      if (pathname !== overview) {
        router.push(overview);
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const digest =
        typeof error === "object" && error && "digest" in error
          ? String((error as { digest?: string }).digest)
          : "";
      if (digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      if (
        message.includes("UnrecognizedActionError") ||
        message.includes("was not found on the server")
      ) {
        window.location.reload();
        return;
      }
      throw error;
    } finally {
      setActive(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" disabled={active}>
        {active ? "Starting…" : label}
      </Button>
      {active ? (
        <AssessmentRunOverlay
          projectId={projectId}
          progress={progress}
          onProgress={setProgress}
        />
      ) : null}
    </form>
  );
}

export function IntelligenceOverviewRunForm({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const pathname = usePathname();
  if (pathname !== intelligenceHref(projectId)) {
    return null;
  }

  return <AssessmentRunForm projectId={projectId} label={label} />;
}

function AssessmentRunOverlay({
  projectId,
  progress,
  onProgress,
}: {
  projectId: string;
  progress: IntelligenceRunProgress;
  onProgress: (
    update:
      | IntelligenceRunProgress
      | ((current: IntelligenceRunProgress) => IntelligenceRunProgress),
  ) => void;
}) {
  useEffect(() => {
    if (progress.done) {
      return;
    }

    let cancelled = false;

    async function tick() {
      const response = await fetch(
        `/api/projects/${projectId}/intelligence/progress`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) {
        return;
      }

      const next = (await response.json()) as IntelligenceRunProgress;
      if (!cancelled && next?.stage) {
        onProgress((current) => advanceRunProgress(current, next));
      }
    }

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onProgress, progress.done, projectId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90"
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      aria-label="Starting Enigma Intelligence"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface px-8 py-7">
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm font-semibold">Starting Enigma Intelligence</p>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-valuetext={progress.stage}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(progress.percent, 4)}%` }}
            />
          </div>
          <p className="text-center text-sm text-muted">
            {progress.stage}
            {progress.done ? null : (
              <span className="ml-0.5 inline-flex" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className="run-stage-dot"
                    style={{ animationDelay: `${index * 160}ms` }}
                  >
                    .
                  </span>
                ))}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
