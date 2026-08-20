import "server-only";

import {
  anthropicMessageBody,
  readAnthropicText,
  resolveInferenceConfig,
  toAnthropicMessages,
  type InferenceConfig,
  type InferenceMessage,
} from "@/modules/inference/config";

export type { InferenceMessage };

export async function completeChat(input: {
  messages: InferenceMessage[];
  json?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const config = resolveInferenceConfig();
  if (!config) {
    return null;
  }

  try {
    return await completeAnthropic(config, input);
  } catch {
    console.error("Ask model request failed.");
    return null;
  }
}

async function completeAnthropic(
  config: InferenceConfig,
  input: {
    messages: InferenceMessage[];
    maxTokens?: number;
    timeoutMs?: number;
  },
) {
  const { system, messages } = toAnthropicMessages(input.messages);
  if (messages.length === 0) {
    return null;
  }

  const requestBody = anthropicMessageBody({
    model: config.model,
    maxTokens: input.maxTokens ?? 700,
    system: system || undefined,
    messages,
  });
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(input.timeoutMs ?? config.timeoutMs),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { type?: string; message?: string };
    } | null;
    console.error(
      `Ask model request failed: ${response.status} ${payload?.error?.type ?? ""} ${payload?.error?.message ?? ""}`.trim(),
    );
    return null;
  }

  const result = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  return readAnthropicText(result) || null;
}
