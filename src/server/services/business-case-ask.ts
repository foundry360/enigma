import "server-only";

import {
  briefingToPrompt,
  fallbackNarratives,
  type BusinessCaseBriefing,
} from "@/modules/economics/briefing";

export async function explainBusinessCase(briefing: BusinessCaseBriefing) {
  const fallback = fallbackNarratives(briefing);
  const modeled = await explainWithModel(briefingToPrompt(briefing));

  return {
    recommendationState: briefing.recommendationState,
    recommendationNarrative:
      modeled?.recommendation ?? fallback.recommendationNarrative,
    intelligenceNarrative:
      modeled?.intelligence ?? fallback.intelligenceNarrative,
  };
}

async function explainWithModel(briefing: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "You explain an Enigma project Business Case.",
              "Use only the briefing. Do not invent scores, volumes, prices, licenses, or ROI.",
              "Do not change calculated numbers. If a total is missing, say Insufficient data.",
              "Cite evidence citations when they exist.",
              "Return JSON only with keys recommendation and intelligence.",
              "recommendation: 2-4 sentences on the fallback recommendation state, supporting factors, and risks.",
              "intelligence: 2-4 sentences on what inherited signals mean for this case.",
              "",
              briefing,
            ].join("\n"),
          },
          {
            role: "user",
            content:
              "Write the recommendation and intelligence narratives for this business case.",
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content.replace(/^```json\n?|```$/g, "")) as {
      recommendation?: string;
      intelligence?: string;
    };

    if (!parsed.recommendation || !parsed.intelligence) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
