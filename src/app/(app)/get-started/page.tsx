import { Clock } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";

export default function GetStartedPage() {
  return (
    <PageFrame
      title="Get Started"
      description="A short guide to setting up your workspace, organizations, and first project."
      icon={<Clock size={20} strokeWidth={1.75} className="shrink-0 text-muted" />}
    >
      <div className="rounded-md border border-border bg-background px-4 py-8 text-center">
        <p className="text-sm text-muted">Not implemented yet.</p>
      </div>
    </PageFrame>
  );
}
