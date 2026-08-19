import "server-only";

import {
  readAnthropicText,
  resolveInferenceConfig,
  toAnthropicMessages,
  type InferenceConfig,
  type InferenceMessage,
} from "@/modules/inference/config";

export type { InferenceMessage };

export async function completeChat(input: {
  messages: InferenceMessage[];
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const config = resolveInferenceConfig();
  if (!config) {
    return null;
  }

  try {
    return completeAnthropic(config, input);
  } catch {
    return null;
  }
}

async function completeAnthropic(
  config: InferenceConfig,
  input: {
    messages: InferenceMessage[];
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  },
) {
  const { system, messages } = toAnthropicMessages(input.messages);
  if (messages.length === 0) {
    return null;
  }

  const requestBody = {
    model: config.model,
    max_tokens: input.maxTokens ?? 700,
    temperature: input.temperature ?? 0.3,
    system: system || undefined,
    messages,
  };
  const headers = {
    "content-type": "application/json",
    "x-api-key": config.apiKey,
    "anthropic-version": "2023-06-01",
  };
  const timeoutMs = input.timeoutMs ?? config.timeoutMs;

  const first = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...requestBody, thinking: { type: "disabled" } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const response = first.ok
    ? first
    : await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs),
      });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  return readAnthropicText(result) || null;
}
