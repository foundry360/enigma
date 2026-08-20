"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { askIntelligenceAction } from "@/app/actions/intelligence";
import {
  readAskChat,
  writeAskChat,
  type AskMessage,
} from "@/components/intelligence/ask-store";
import { AskThinking } from "@/components/intelligence/ask-thinking";

export function IntelligenceAsk({
  projectId,
  assessmentId,
  ready,
  suggestions,
}: {
  projectId: string;
  assessmentId: string | null;
  ready: boolean;
  suggestions: string[];
}) {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useLayoutEffect(() => {
    const stored = readAskChat(projectId, assessmentId);
    setMessages(stored.messages);
    setInput(stored.input);
    restored.current = true;
  }, [projectId, assessmentId]);

  useEffect(() => {
    if (!restored.current) {
      return;
    }

    writeAskChat(projectId, assessmentId, { messages, input });
  }, [projectId, assessmentId, messages, input]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, pending]);

  function send(question: string) {
    const text = question.trim();
    if (!text || !assessmentId || !ready || pending) {
      return;
    }

    const history = messages.slice(-8);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: text }]);

    startTransition(async () => {
      const result = await askIntelligenceAction({
        projectId,
        assessmentId,
        question: text,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            result.answer ??
            result.error ??
            "I could not explain this project. Try a signal, opportunity, calculation, or next step.",
        },
      ]);
    });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-ask">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" />
          Ask Enigma
        </h2>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-ask-thread px-5 py-4">
        {!ready ? (
          <p className="text-sm text-muted">
            Run intelligence to ask about what Enigma found in the connected
            environment.
          </p>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Ask me to decipher a recommendation, a calculation, an
              opportunity, the evidence, or what a gap blocks next.
            </p>
            {suggestions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((message, index) =>
            message.role === "user" ? (
              <div
                key={`${message.role}-${index}`}
                className="ml-6 rounded-md bg-accent px-3 py-2 text-sm text-accent-fg"
              >
                {message.content}
              </div>
            ) : (
              <AskAnswer key={`${message.role}-${index}`} content={message.content} />
            ),
          )
        )}
        {pending ? <AskThinking /> : null}
      </div>

      <form
        className="border-t border-border bg-ask-footer p-4"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor="intelligence-ask">
          Ask Enigma about this project
        </label>
        <div className="relative">
          <textarea
            id="intelligence-ask"
            rows={3}
            value={input}
            disabled={!ready || pending}
            placeholder={ready ? "What can I help you with..." : "Run intelligence first"}
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 pr-12 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-foreground disabled:opacity-60"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={!ready || pending || !input.trim()}
            aria-label="Send"
            className="absolute right-2 bottom-2 inline-flex size-8 items-center justify-center rounded-md text-muted hover:text-foreground disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </aside>
  );
}

function AskAnswer({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="mr-2 space-y-2.5 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const items = lines.filter((line) => /^[-*•]\s+/.test(line));
        if (items.length === 0) {
          return <p key={index}>{block}</p>;
        }

        const intro = lines.filter((line) => !/^[-*•]\s+/.test(line)).join(" ");
        return (
          <div key={index} className="space-y-2">
            {intro ? <p>{intro}</p> : null}
            <ul className="list-disc space-y-1 pl-5">
              {items.map((line, itemIndex) => (
                <li key={itemIndex}>{line.replace(/^[-*•]\s+/, "")}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

