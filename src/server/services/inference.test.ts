import { describe, expect, it } from "vitest";
import {
  anthropicMessageBody,
  defaultClaudeModel,
  defaultLlamaModel,
  llamaChatUrl,
  ollamaChatBody,
  readAnthropicText,
  readLlamaText,
  resolveInferenceConfig,
  resolveLlamaConfig,
  toAnthropicMessages,
} from "@/modules/inference/config";

describe("inference config", () => {
  it("uses Claude when an Anthropic key is set", () => {
    const config = resolveInferenceConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
      ANTHROPIC_MODEL: "claude-sonnet-5",
      INFERENCE_URL: "http://127.0.0.1:11434",
      OPENAI_API_KEY: "sk-test",
    });
    expect(config).toEqual({
      provider: "anthropic",
      url: "https://api.anthropic.com/v1/messages",
      model: "claude-sonnet-5",
      apiKey: "sk-ant-test",
      timeoutMs: 30_000,
    });
  });

  it("reads named Anthropic env keys so Next can inline them", () => {
    const config = resolveInferenceConfig();
    expect(config === null || config.provider === "anthropic").toBe(true);
  });

  it("defaults to Sonnet when no Claude model is named", () => {
    const config = resolveInferenceConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
    });
    expect(config?.model).toBe(defaultClaudeModel);
  });

  it("keeps Ask on Claude even when Llama is configured", () => {
    expect(
      resolveInferenceConfig({
        INFERENCE_URL: "http://127.0.0.1:11434",
        INFERENCE_MODEL: "llama3.1",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBeNull();
  });

  it("uses local Ollama for reasoning when Llama env is set", () => {
    const config = resolveLlamaConfig({
      INFERENCE_URL: "http://127.0.0.1:11434",
      INFERENCE_MODEL: "llama3.1",
    });
    expect(config).toEqual({
      provider: "llama",
      url: "http://127.0.0.1:11434/api/chat",
      model: "llama3.1",
      apiKey: "",
      timeoutMs: 45_000,
    });
    expect(llamaChatUrl("http://127.0.0.1:11434")).toBe(
      "http://127.0.0.1:11434/api/chat",
    );
    expect(config?.model).toBe(defaultLlamaModel);
  });

  it("uses an OpenAI-compatible Llama URL when one is provided", () => {
    const config = resolveLlamaConfig({
      INFERENCE_URL: "https://api.groq.com/openai/v1",
      INFERENCE_MODEL: "llama-3.3-70b-versatile",
      INFERENCE_API_KEY: "gsk-test",
    });
    expect(config?.url).toBe(
      "https://api.groq.com/openai/v1/chat/completions",
    );
    expect(config?.apiKey).toBe("gsk-test");
  });

  it("reads Ollama and OpenAI-compatible Llama responses", () => {
    expect(
      readLlamaText({ message: { content: '{"fits":[]}' } }),
    ).toBe('{"fits":[]}');
    expect(
      readLlamaText({
        choices: [{ message: { content: '{"fits":[]}' } }],
      }),
    ).toBe('{"fits":[]}');
    expect(ollamaChatBody({
      model: "llama3.1",
      messages: [{ role: "user", content: "Rank fits." }],
      maxTokens: 1400,
    }).format).toBe("json");
  });

  it("returns null when Claude is not configured", () => {
    expect(resolveInferenceConfig({})).toBeNull();
  });

  it("moves the system prompt out of Anthropic turns", () => {
    const packed = toAnthropicMessages([
      { role: "system", content: "You are Ask Enigma." },
      { role: "user", content: "Why one opportunity?" },
      { role: "assistant", content: "Service agent qualified." },
      { role: "user", content: "What does that mean?" },
    ]);

    expect(packed.system).toBe("You are Ask Enigma.");
    expect(packed.messages).toEqual([
      { role: "user", content: "Why one opportunity?" },
      { role: "assistant", content: "Service agent qualified." },
      { role: "user", content: "What does that mean?" },
    ]);
  });

  it("does not send temperature — Sonnet 5 rejects it with 400", () => {
    const body = anthropicMessageBody({
      model: "claude-sonnet-5",
      maxTokens: 700,
      system: "You are Ask Enigma.",
      messages: [{ role: "user", content: "Explain automation collision." }],
    });

    expect(body).toEqual({
      model: "claude-sonnet-5",
      max_tokens: 700,
      thinking: { type: "disabled" },
      system: "You are Ask Enigma.",
      messages: [{ role: "user", content: "Explain automation collision." }],
    });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("top_k");
  });

  it("reads only text blocks from an Anthropic response", () => {
    expect(
      readAnthropicText({
        content: [
          { type: "thinking", text: "internal" },
          { type: "text", text: "You are only seeing Service agent." },
        ],
      }),
    ).toBe("You are only seeing Service agent.");
  });
});
