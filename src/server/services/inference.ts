import "server-only";

import {
  anthropicMessageBody,
  isOpenAiCompatibleUrl,
  ollamaChatBody,
  openAiChatBody,
  readAnthropicText,
  readLlamaText,
  resolveInferenceConfig,
  resolveLlamaConfig,
  toAnthropicMessages,
  type InferenceConfig,
  type InferenceMessage,
} from "@/modules/inference/config";

export type { InferenceMessage };

export type ReasoningCompletion = {
  text: string;
  provider: InferenceConfig["provider"];
  model: string;
};

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

export async function completeReasoningChat(input: {
  messages: InferenceMessage[];
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<ReasoningCompletion | null> {
  const llama = resolveLlamaConfig();
  if (llama) {
    try {
      const text = await completeLlama(llama, input);
      if (text) {
        return { text, provider: "llama", model: llama.model };
      }
    } catch {
      console.error("Llama reasoning request failed.");
    }
  }

  const claude = resolveInferenceConfig();
  if (!claude) {
    return null;
  }

  try {
    const text = await completeAnthropic(claude, input);
    return text
      ? { text, provider: "anthropic", model: claude.model }
      : null;
  } catch {
    console.error("Claude reasoning request failed.");
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

async function completeLlama(
  config: InferenceConfig,
  input: {
    messages: InferenceMessage[];
    maxTokens?: number;
    timeoutMs?: number;
  },
) {
  const { system, messages } = toAnthropicMessages(input.messages);
  const turns = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages,
  ];
  if (turns.length === 0) {
    return null;
  }

  const openAi = isOpenAiCompatibleUrl(config.url);
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify(
      openAi
        ? openAiChatBody({
            model: config.model,
            messages: turns,
            maxTokens: input.maxTokens ?? 1400,
          })
        : ollamaChatBody({
            model: config.model,
            messages: turns,
            maxTokens: input.maxTokens ?? 1400,
          }),
    ),
    signal: AbortSignal.timeout(input.timeoutMs ?? config.timeoutMs),
  });

  if (!response.ok) {
    const payload = (await response.text().catch(() => "")).slice(0, 300);
    console.error(
      `Llama reasoning request failed: ${response.status} ${payload}`.trim(),
    );
    return null;
  }

  return readLlamaText((await response.json()) as {
    message?: { content?: string };
    choices?: Array<{ message?: { content?: string } }>;
  });
}
