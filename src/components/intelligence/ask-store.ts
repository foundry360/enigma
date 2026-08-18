export type AskMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskChat = {
  messages: AskMessage[];
  input: string;
};

const memory = new Map<string, AskChat>();

function chatKey(projectId: string, assessmentId: string | null) {
  return `enigma-ask:${projectId}:${assessmentId ?? "none"}`;
}

export function readAskChat(
  projectId: string,
  assessmentId: string | null,
): AskChat {
  const key = chatKey(projectId, assessmentId);
  const cached = memory.get(key);
  if (cached) {
    return cached;
  }

  if (typeof window === "undefined") {
    return { messages: [], input: "" };
  }

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return { messages: [], input: "" };
    }

    const parsed = JSON.parse(raw) as { messages?: AskMessage[] };
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter(
          (message) =>
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string",
        )
      : [];
    const next = { messages, input: "" };
    memory.set(key, next);
    return next;
  } catch {
    return { messages: [], input: "" };
  }
}

export function writeAskChat(
  projectId: string,
  assessmentId: string | null,
  chat: AskChat,
) {
  const key = chatKey(projectId, assessmentId);
  memory.set(key, chat);

  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(key, JSON.stringify({ messages: chat.messages }));
  } catch {
    // Ignore quota or private-mode failures.
  }
}
