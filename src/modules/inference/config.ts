export type InferenceMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InferenceProvider = "anthropic" | "llama";

export type InferenceConfig = {
  provider: InferenceProvider;
  url: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
};

export const defaultLlamaModel = "llama3.1";
export const defaultLlamaUrl = "http://127.0.0.1:11434";

export const defaultClaudeModel = "claude-sonnet-5";

export function resolveInferenceConfig(
  env: Record<string, string | undefined> = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    INFERENCE_TIMEOUT_MS: process.env.INFERENCE_TIMEOUT_MS,
  },
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

export function resolveLlamaConfig(
  env: Record<string, string | undefined> = {
    INFERENCE_URL: process.env.INFERENCE_URL,
    INFERENCE_MODEL: process.env.INFERENCE_MODEL,
    INFERENCE_API_KEY: process.env.INFERENCE_API_KEY,
    INFERENCE_TIMEOUT_MS: process.env.INFERENCE_TIMEOUT_MS,
  },
): InferenceConfig | null {
  const url = env.INFERENCE_URL?.trim();
  const model = env.INFERENCE_MODEL?.trim();
  if (!url && !model) {
    return null;
  }

  const timeoutMs = Number(env.INFERENCE_TIMEOUT_MS);
  const base = (url || defaultLlamaUrl).replace(/\/$/, "");

  return {
    provider: "llama",
    url: llamaChatUrl(base),
    model: model || defaultLlamaModel,
    apiKey: env.INFERENCE_API_KEY?.trim() || "",
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45_000,
  };
}

export function llamaChatUrl(base: string) {
  if (/\/v1\/chat\/completions$/i.test(base) || /\/api\/chat$/i.test(base)) {
    return base;
  }
  if (/\/v1$/i.test(base)) {
    return `${base}/chat/completions`;
  }
  return `${base}/api/chat`;
}

export function isOpenAiCompatibleUrl(url: string) {
  return /\/v1\/chat\/completions$/i.test(url);
}

export function ollamaChatBody(input: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
}) {
  return {
    model: input.model,
    messages: input.messages,
    stream: false,
    format: "json",
    options: { num_predict: input.maxTokens },
  };
}

export function openAiChatBody(input: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
}) {
  return {
    model: input.model,
    messages: input.messages,
    max_tokens: input.maxTokens,
    response_format: { type: "json_object" },
  };
}

export function readLlamaText(payload: {
  message?: { content?: string };
  choices?: Array<{ message?: { content?: string } }>;
}) {
  const ollama = payload.message?.content?.trim();
  if (ollama) {
    return ollama;
  }
  return (
    payload.choices
      ?.map((choice) => choice.message?.content?.trim())
      .filter(Boolean)
      .join("\n\n")
      .trim() || null
  );
}

export function anthropicMessageBody(input: {
  model: string;
  maxTokens: number;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    thinking: { type: "disabled" as const },
    ...(input.system ? { system: input.system } : {}),
    messages: input.messages,
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
