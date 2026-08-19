export type InferenceMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InferenceConfig = {
  provider: "anthropic";
  url: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
};

export const defaultClaudeModel = "claude-sonnet-5";

export function resolveInferenceConfig(
  env: Record<string, string | undefined> = process.env,
): InferenceConfig | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const timeoutMs = Number(env.INFERENCE_TIMEOUT_MS);

  return {
    provider: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    model: env.ANTHROPIC_MODEL?.trim() || defaultClaudeModel,
    apiKey,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000,
  };
}

export function toAnthropicMessages(messages: InferenceMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const turns: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    const last = turns[turns.length - 1];
    if (last && last.role === message.role) {
      last.content = `${last.content}\n\n${message.content}`;
      continue;
    }

    turns.push({ role: message.role, content: message.content });
  }

  if (turns[0]?.role === "assistant") {
    turns.unshift({ role: "user", content: "Continue from the project brief." });
  }

  return { system, messages: turns };
}

export function readAnthropicText(payload: {
  content?: Array<{ type?: string; text?: string }>;
}) {
  return (payload.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
