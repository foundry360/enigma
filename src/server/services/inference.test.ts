import { describe, expect, it } from "vitest";
import {
  defaultClaudeModel,
  readAnthropicText,
  resolveInferenceConfig,
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

  it("defaults to Sonnet when no Claude model is named", () => {
    const config = resolveInferenceConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
    });
    expect(config?.model).toBe(defaultClaudeModel);
  });

  it("does not fall back to Llama or OpenAI", () => {
    expect(
      resolveInferenceConfig({
        INFERENCE_URL: "http://127.0.0.1:11434",
        INFERENCE_MODEL: "llama3.1",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBeNull();
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
