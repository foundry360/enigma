import { signalExplainers } from "@/modules/intelligence/signals";
import type { SignalKey, SignalStrength } from "@/modules/intelligence/types";

const titles: Record<SignalKey, string[]> = {
  addressable_work: ["Addressable work"],
  operating_path: ["Operating path"],
  grounded_answers: ["Grounded answers"],
  automation_collision: ["Automation collision"],
  access_surface: ["Access control", "Access surface"],
  writeback_control: ["Write-back control"],
};

const advice: Record<
  SignalKey,
  { meaning: string; risk: string; consumption: string; next: string }
> = {
  addressable_work: {
    meaning: "Durable work records are what an agent can read and act on.",
    risk: "Without a durable work object, volume and value have to be invented.",
    consumption: "A consumption figure would invent the work object first.",
    next: "Confirm the work object the agent will sit on before treating volume as settled.",
  },
  operating_path: {
    meaning: "A recognizable path is how work starts, moves, and hands off.",
    risk: "Without a path, the agent invents process and consumption becomes unbounded chat.",
    consumption: "Usage would be unscoped, so a forecast would not stay honest.",
    next: "Name one start, one handoff, and where the agent should stop.",
  },
  grounded_answers: {
    meaning: "A knowledge base is what an agent can read to provide responses instead of inventing them.",
    risk: "Without a knowledge base, answers are guessed. Thin or stale articles still show up as confident wrong answers.",
    consumption: "Q&A consumption would be ungrounded and would overstate value.",
    next: "Confirm there is a knowledge base that covers one high-volume question before treating retrieval as ready.",
  },
  automation_collision: {
    meaning: "Existing automations may already write the same work an agent would touch.",
    risk: "The agent can duplicate or fight those paths and create cleanup cost.",
    consumption: "Forecast volume should assume overlap, not clean deflection.",
    next: "Inventory automations that write the same records before a write-back pilot.",
  },
  access_surface: {
    meaning: "This is whether you can limit what the agent is allowed to see and change.",
    risk: "A broad or reused human profile is the main access failure mode. Least-privilege is harder when the permission surface is large or unread.",
    consumption: "A broad identity over-consumes write actions and makes the forecast noisy.",
    next: "Give the agent a dedicated permission set. Do not reuse a broad human profile.",
  },
  writeback_control: {
    meaning: "This is whether write-path rules would keep agent-created records complete.",
    risk: "Thin required fields and validation let an agent bypass process and create incomplete work.",
    consumption: "Unchecked write-back inflates consumption through retries and cleanup.",
    next: "Decide which fields the agent may write, and lock the rest before a write-back pilot.",
  },
};

export function signalAdvice(input: { key?: string; title: string }) {
  const key = resolveSignalKey(input.key, input.title);
  if (!key) {
    return {
      title: input.title,
      explainer: "",
      meaning: `${input.title} is a readiness signal on this case.`,
      risk: `${input.title} is not yet strong enough to treat the path as unconstrained.`,
      consumption: "",
      next: `Strengthen ${input.title} before treating go-live as unconstrained.`,
    };
  }

  return {
    title: titles[key][0],
    explainer: signalExplainers[key],
    ...advice[key],
  };
}

export function resolveSignalKey(key: string | undefined, title: string) {
  if (key && Object.hasOwn(advice, key)) {
    return key as SignalKey;
  }

  const needle = title.trim().toLowerCase();
  return (
    (Object.keys(titles) as SignalKey[]).find((item) =>
      titles[item].some((label) => label.toLowerCase() === needle),
    ) ?? null
  );
}

export function describeWeakSignal(input: {
  key?: string;
  title: string;
  strength: SignalStrength | string;
  evidence?: string[];
}) {
  const copy = signalAdvice(input);

  return `${copy.title} is still weak. ${copy.risk} ${copy.next}`;
}
