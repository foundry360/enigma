import {
  explainCaseCalculations,
  type BusinessCaseBriefing,
} from "@/modules/economics/briefing";
import { recommendationLabel, rollUpCase } from "@/modules/economics/model";
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";
import {
  answerFromBriefing,
  formatCandidateAnswer,
  formatSignalAnswer,
  isOfficialPriceAsk,
  isOpportunityCountAsk,
  type IntelligenceBriefing,
} from "@/modules/intelligence/briefing";
import { formatAskAnswer } from "@/modules/intelligence/ask-format";
import { summarizeEvidenceLayers } from "@/modules/intelligence/evidence-expand";
import { summarizeImplication } from "@/modules/intelligence/opportunity-summaries";
import { composeKnowledge } from "@/modules/knowledge";

export type ProjectAskBriefing = {
  intelligence: IntelligenceBriefing;
  businessCase: BusinessCaseBriefing | null;
};

export function navigatorInstructions(question?: string) {
  return composeKnowledge({ surface: "ask", question });
}

export function resolveAskQuestion(
  question: string,
  history?: Array<{ role: string; content: string }>,
) {
  const trimmed = question.trim();
  if (!isFollowUp(trimmed)) {
    return trimmed;
  }

  const prior = [...(history ?? [])]
    .reverse()
    .find((message) => message.role === "user")
    ?.content.trim();

  if (!prior) {
    return trimmed;
  }

  return `${prior} Follow-up: ${trimmed}`;
}

function isFollowUp(question: string) {
  return /what does (that|this|it|they) mean|what do they mean|why is that|tell me more|and why|for this project|how so|same for|can you (explain|expand)|what if|if we (change|reduce|increase|set)/i.test(
    question,
  );
}

export function projectAskPrompt(
  briefing: ProjectAskBriefing,
  question?: string,
) {
  return [
    composeKnowledge({ surface: "ask", question, limit: 4 }),
    compactProjectBriefing(briefing, question),
  ].join("\n\n");
}

function wantsCalculationWalk(question?: string) {
  const text = question ?? "";
  if (/driver|implication|mean|why are they|why is it important/i.test(text)) {
    return false;
  }

  return /how (is|do|does|are)|walk me through|calculat|formula|\broc\b|\broi\b|payback/i.test(
    text,
  );
}

function compactProjectBriefing(
  briefing: ProjectAskBriefing,
  question?: string,
) {
  const signals = briefing.intelligence.signals
    .map((signal) => formatSignalAnswer(signal))
    .join("\n\n");
  const candidates = briefing.intelligence.candidates
    .map((candidate) => {
      const evidence = summarizeEvidenceLayers({
        citations: candidate.evidence,
      })
        .map((layer) => layer.paragraph)
        .join(" ");
      return [formatCandidateAnswer(candidate), evidence].filter(Boolean).join("\n\n");
    })
    .join("\n\n");

  const parts = [
    `Environment: ${briefing.intelligence.environment}.`,
    signals || "No business signals were produced.",
    candidates || "No opportunity candidates were produced.",
  ];

  if (!briefing.businessCase) {
    parts.push(
      "No business case has been opened yet. Promote a candidate before totals can be explained.",
    );
    return parts.join("\n\n");
  }

  parts.push(
    briefing.businessCase.opportunities
      .map((item) =>
        [
          `${item.name} implications.`,
          summarizeImplication("Consumption drivers", item.consumptionDrivers),
          summarizeImplication("Value drivers", item.valueDrivers),
          summarizeImplication("Constraints", item.constraints),
          summarizeImplication("Dependencies", item.dependencies),
        ].join(" "),
      )
      .join("\n") || "No implication copy yet.",
  );

  if (wantsCalculationWalk(question) || parseCaseWhatIf(question ?? "")) {
    parts.push(
      briefing.businessCase.calculations.join("\n") || "No calculated lines yet.",
    );
  }

  if (/recommend|proceed|defer|validate/i.test(question ?? "")) {
    parts.push(briefing.businessCase.recommendationWhy);
  }

  parts.push(
    briefing.businessCase.gaps.length
      ? `Gaps: ${briefing.businessCase.gaps.join(" ")}`
      : "No listed input gaps.",
    `Deployment path: Confirm the case (${recommendationLabel[briefing.businessCase.recommendationState]}), stand up the work, then go live.`,
  );

  return parts.join("\n\n");
}

export function hasScriptedProjectAnswer(
  question: string,
  briefing: ProjectAskBriefing,
  history?: Array<{ role: string; content: string }>,
) {
  const trimmed = resolveAskQuestion(question, history);
  if (
    isOfficialPriceAsk(trimmed) ||
    isOpportunityCountAsk(trimmed) ||
    parseCaseWhatIf(question) ||
    parseCaseWhatIf(trimmed)
  ) {
    return true;
  }

  if (
    /value driver|consumption driver|implication|constraint|dependenc/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (!briefing.businessCase) {
    return false;
  }

  return (
    /consump|impacted|\broc\b|\broi\b|payback|\broa\b|accelerat|calculat|formula|how (is|do|does|are).*(value|consumption|impacted)/i.test(
      trimmed,
    ) ||
    /recommend|proceed|defer|validate|should (we|i) (go|proceed)|next (step|move)/i.test(
      trimmed,
    ) ||
    /gap|risk|block|watch|missing|incomplete/i.test(trimmed)
  );
}

export function answerProjectAsk(
  question: string,
  briefing: ProjectAskBriefing,
  history?: Array<{ role: string; content: string }>,
) {
  const trimmed = resolveAskQuestion(question, history);
  const businessCase = briefing.businessCase;

  if (isOfficialPriceAsk(trimmed)) {
    return formatAskAnswer(
      "This project does not contain official Salesforce prices or licenses. Use the customer's work item cost on the Business Case. I can explain how Consumption, Value, ROC, and ROI are calculated from those inputs.",
    );
  }

  const whatIf = parseCaseWhatIf(question) ?? parseCaseWhatIf(trimmed);
  if (businessCase && whatIf) {
    return formatAskAnswer(explainCaseWhatIf(businessCase, whatIf));
  }

  if (
    /value driver|consumption driver|implication|constraint|dependenc/i.test(
      trimmed,
    )
  ) {
    return formatAskAnswer(explainImplications(trimmed, briefing));
  }

  if (
    businessCase &&
    /consump|impacted|\broc\b|\broi\b|payback|\broa\b|accelerat|calculat|formula|how (is|do|does|are).*(value|consumption|impacted)/i.test(
      trimmed,
    )
  ) {
    return formatAskAnswer(
      [
        businessCase.calculations.join("\n\n"),
        businessCase.gaps.length
          ? `Still open: ${businessCase.gaps.map(asSentence).join(" ")}`
          : "",
        "Official Salesforce prices are not used.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  if (
    businessCase &&
    /recommend|proceed|defer|validate|should (we|i) (go|proceed)|next (step|move)/i.test(
      trimmed,
    )
  ) {
    return formatAskAnswer(reasonAboutRecommendation(briefing));
  }

  if (businessCase && /gap|risk|block|watch|missing|incomplete/i.test(trimmed)) {
    const gaps = businessCase.gaps.length
      ? `Business case gaps: ${businessCase.gaps.map(asSentence).join(" ")}`
      : "The business case has no listed input gaps.";
    const risks = briefing.intelligence.signals
      .filter((signal) => signal.risk)
      .map((signal) => `${signal.title} still carries this risk. ${asSentence(signal.risk)}`);
    const constraints = briefing.intelligence.candidates.flatMap((candidate) =>
      candidate.constraints.map(
        (constraint) =>
          `On ${candidate.name}, ${asSentence(constraint.charAt(0).toLowerCase() + constraint.slice(1))}`,
      ),
    );
    return formatAskAnswer(
      [
        gaps,
        risks.length
          ? risks.join(" ")
          : "No signal risks are listed on this run.",
        constraints.length
          ? constraints.join(" ")
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  const fromIntel = answerFromBriefing(trimmed, briefing.intelligence);
  if (
    businessCase &&
    /I can only explain this intelligence run/i.test(fromIntel)
  ) {
    return formatAskAnswer(
      "I can walk the saved Business Case numbers, or rerun them as a what-if if you change work item cost, work per year, hours, labor cost, or share. Official Salesforce prices are not used.",
    );
  }

  return formatAskAnswer(fromIntel);
}

export function parseCaseWhatIf(question: string) {
  if (
    !/what if|if (we |i )?(change|reduce|increase|set|drop|lower|raise|cut)|work (item )?cost|item cost|unit price/i.test(
      question,
    )
  ) {
    return null;
  }

  const amount = parseAskAmount(question);
  if (amount == null) {
    return null;
  }

  if (/share|adoption/i.test(question)) {
    return { adoption: amount > 1 ? amount / 100 : amount };
  }
  if (/work per year|annual volume|\bvolume\b/i.test(question)) {
    return { annualVolume: amount };
  }
  if (/labor|hourly|per hour/i.test(question)) {
    return { hourlyCost: amount };
  }
  if (/\bhours\b|hours given|hours saved/i.test(question)) {
    return { hoursSavedPerUnit: amount };
  }
  if (
    /work (item )?cost|item cost|unit price|work cost item/i.test(question) ||
    /\$/.test(question)
  ) {
    return { unitPrice: amount };
  }

  return null;
}

function parseAskAmount(question: string) {
  const money = question.match(/\$\s*(\d[\d,]*)?(\.\d+)?/);
  if (money && (money[1] || money[2])) {
    const value = Number(
      `${money[1]?.replace(/,/g, "") || "0"}${money[2] ?? ""}`,
    );
    return Number.isFinite(value) ? value : null;
  }

  const bare = question.match(/(?:to|at|of|=)\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (!bare) {
    return null;
  }

  const value = Number(bare[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function explainCaseWhatIf(
  briefing: BusinessCaseBriefing,
  patch: NonNullable<ReturnType<typeof parseCaseWhatIf>>,
) {
  const adoption = patch.adoption ?? numberAssumption(briefing, "Share");
  const opportunities = briefing.opportunities.map((item) => ({
    ...item,
    unitPrice: patch.unitPrice ?? item.unitPrice,
    annualVolume: patch.annualVolume ?? item.annualVolume,
    hoursSavedPerUnit: patch.hoursSavedPerUnit ?? item.hoursSavedPerUnit,
    hourlyCost: patch.hourlyCost ?? item.hourlyCost,
  }));
  const rollup = rollUpCase({
    lines: opportunities.map((item) => ({
      annualVolume: item.annualVolume,
      unitPrice: item.unitPrice,
      hoursSavedPerUnit: item.hoursSavedPerUnit,
      hourlyCost: item.hourlyCost,
      implementationCost: null,
    })),
    adoption,
    baselineDays: numberAssumption(briefing, "Days without Enigma"),
    enigmaDays: numberAssumption(briefing, "Days with Enigma"),
    implementationCost: numberAssumption(briefing, "Investment"),
  });

  return [
    `That is a what-if. It is not saved on the Business Case.`,
    `If ${describeWhatIf(patch)}, the arithmetic becomes:`,
    ...explainCaseCalculations({
      opportunities,
      adoption,
      rollup,
    }),
    "Official Salesforce prices are not used.",
  ].join("\n\n");
}

function describeWhatIf(patch: NonNullable<ReturnType<typeof parseCaseWhatIf>>) {
  if (patch.unitPrice != null) {
    return `work item cost is ${formatCurrencyPrecise(patch.unitPrice)}`;
  }
  if (patch.annualVolume != null) {
    return `work per year is ${patch.annualVolume}`;
  }
  if (patch.hoursSavedPerUnit != null) {
    return `hours given back are ${patch.hoursSavedPerUnit}`;
  }
  if (patch.hourlyCost != null) {
    return `labor cost is ${formatCurrencyPrecise(patch.hourlyCost)} an hour`;
  }
  if (patch.adoption != null) {
    return `share is ${patch.adoption}`;
  }

  return "that customer input changes";
}

function numberAssumption(briefing: BusinessCaseBriefing, label: string) {
  const raw = briefing.assumptions.find((item) => item.label === label)?.value;
  if (!raw || /insufficient|not provided|needed/i.test(raw)) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function explainImplications(question: string, briefing: ProjectAskBriefing) {
  const opportunities =
    briefing.businessCase?.opportunities ??
    briefing.intelligence.candidates.map((candidate) => ({
      name: candidate.name,
      consumptionDrivers: candidate.consumptionDrivers,
      valueDrivers: candidate.valueDrivers,
      constraints: candidate.constraints,
      dependencies: candidate.dependencies,
    }));

  if (opportunities.length === 0) {
    return "Promote an opportunity before Enigma can explain the Implications node.";
  }

  const wantsValue = /value/i.test(question);
  const wantsConsumption = /consumption/i.test(question);
  const wantsConstraint = /constraint/i.test(question);
  const wantsDependency = /dependenc/i.test(question);
  const specific =
    wantsValue || wantsConsumption || wantsConstraint || wantsDependency;

  return opportunities
    .map((item) => {
      const value = briefing.businessCase?.rollup.value;
      const parts: string[] = [];

      if (!specific || wantsValue) {
        parts.push(
          `Value drivers are the ways ${item.name} creates labor value. They are not the Value total.`,
          summarizeImplication("Value drivers", item.valueDrivers),
          "They matter because Value is hours given back, priced at the customer's labor rate. These drivers are the story of where those hours come from. If they do not hold, the calculated Value is only arithmetic on an assumption.",
          value != null
            ? `On this case that arithmetic is ${formatCurrency(value)}.`
            : "The Business Case does not have a calculated Value yet.",
        );
      }
      if (!specific || wantsConsumption) {
        parts.push(
          `Consumption drivers are how ${item.name} would use the platform.`,
          summarizeImplication("Consumption drivers", item.consumptionDrivers),
        );
      }
      if (!specific || wantsConstraint) {
        parts.push(summarizeImplication("Constraints", item.constraints));
        parts.push(explainConstraintsOnThisProject(briefing));
      }
      if (!specific || wantsDependency) {
        parts.push(summarizeImplication("Dependencies", item.dependencies));
      }

      return parts.join("\n\n");
    })
    .join("\n\n");
}

function explainConstraintsOnThisProject(briefing: ProjectAskBriefing) {
  const weak = briefing.intelligence.signals.filter(
    (signal) => signal.strength === "weak",
  );
  const named = weak.map((signal) => signal.title);
  const writeback = named.some((title) => /write-back/i.test(title));
  const access = named.some((title) => /access/i.test(title));
  const automation = named.some((title) => /automation/i.test(title));

  const parts = [
    "For this project that means the agent should sit on one known path and not write freely.",
  ];
  if (automation) {
    parts.push(
      "Existing automation can write the same work, so an agent that creates or updates records can duplicate or fight those paths.",
    );
  }
  if (writeback) {
    parts.push(
      "Write-back control is still weak, so required fields and rules are not enough to reject an incomplete record. Keep the write surface narrow until that tightens.",
    );
  }
  if (access) {
    parts.push(
      "Access control is still weak, so a broad or reused human profile would let the agent see and change more than this case can stand behind.",
    );
  }
  if (named.length > 0) {
    parts.push(
      `Those holds are why the case stays at ${
        briefing.businessCase
          ? recommendationLabel[briefing.businessCase.recommendationState]
          : "a conditional path"
      }.`,
    );
  }

  return parts.join(" ");
}

function reasonAboutRecommendation(briefing: ProjectAskBriefing) {
  const businessCase = briefing.businessCase;
  if (!businessCase) {
    return "Promote a candidate and open the Business Case before Enigma can explain a recommendation.";
  }

  const weak = briefing.intelligence.signals.filter(
    (signal) => signal.strength === "weak",
  );
  const strong = briefing.intelligence.signals.filter(
    (signal) => signal.strength === "strong",
  );
  const signalWhy = weak.length
    ? weak
        .map((signal) => formatSignalAnswer(signal))
        .join("\n\n")
    : "No signals are weak, so the hold is not coming from signal strength.";
  const change = weak.length
    ? `The recommendation moves toward Proceed if ${weak.map((signal) => signal.title).join(" and ")} strengthen and those risks close.`
    : "The recommendation moves toward Proceed if the remaining case condition is closed.";
  const support = strong.length
    ? `The case still has support from ${strong.map((signal) => signal.title).join(", ")}.`
    : "";

  return [
    businessCase.recommendationWhy,
    [signalWhy, support].filter(Boolean).join(" "),
    `${change} After the case is saved, Deployment is confirm the case, stand up the work, then go live.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function asSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(body) ? body : `${body}.`;
}

export function suggestedProjectAsks(briefing: ProjectAskBriefing) {
  const asks: string[] = [];
  const candidate = briefing.intelligence.candidates[0];
  const weakest = [...briefing.intelligence.signals].sort(
    (left, right) => left.score - right.score,
  )[0];

  if (briefing.businessCase) {
    asks.push("Why this recommendation, and what would change it?");
    asks.push("Walk me through how consumption and value were calculated.");
    if (briefing.businessCase.gaps.length > 0 || weakest) {
      asks.push("What do the gaps and risks block, and what should I do next?");
    } else if (candidate) {
      asks.push(
        `What evidence supports ${candidate.name}, and what must be in place?`,
      );
    }
    return asks.slice(0, 3);
  }

  if (candidate) {
    asks.push(
      `Why is ${candidate.name} a candidate, and what evidence supports it?`,
    );
  }
  if (weakest) {
    asks.push(
      `What does the ${weakest.title} risk block, and how do we strengthen it?`,
    );
  }
  asks.push("What should I do next to turn this run into a business case?");
  return asks.slice(0, 3);
}
