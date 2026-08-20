const DECIMAL = "\u0000";

export function looksLikeAskDump(text: string, question?: string) {
  if (question && askedToNameOrList(question)) {
    return false;
  }

  return (
    /Evidence:\s+\S+:/.test(text) ||
    (/\(\s*strong\s*\)/i.test(text) && /\(\s*weak\s*\)/i.test(text)) ||
    /:\s*[^.]{0,60}(?:,\s*[^,]+){6,}/.test(text)
  );
}

function askedToNameOrList(question: string) {
  return /name|list|what are they|what are the|which (are|objects|profiles|queues)|who can|how many/i.test(
    question,
  );
}

export function formatAskAnswer(text: string) {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) {
    return "";
  }

  const protectedText = trimmed.replace(/(\d)\.(\d)/g, `$1${DECIMAL}$2`);
  const paragraphs = protectedText
    .split(/\n{2,}/)
    .flatMap((paragraph) => formatBlock(paragraph))
    .filter(Boolean);

  const joined =
    paragraphs.length > 0
      ? paragraphs.join("\n\n")
      : formatParagraph(protectedText);

  return joined.replaceAll(DECIMAL, ".");
}

function formatBlock(paragraph: string) {
  const list = extractList(paragraph);
  if (!list) {
    return [formatParagraph(paragraph)];
  }

  return [
    list.intro ? formatParagraph(list.intro.replace(/:$/, "")) : "",
    list.items.map((item) => `- ${item.replace(/\.$/, "").trim()}`).join("\n"),
    list.after ? formatParagraph(list.after) : "",
  ].filter(Boolean);
}

function extractList(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const marked = lines.filter((line) => isListLine(line));
  if (marked.length >= 2 || (marked.length === 1 && lines.length === 1)) {
    return {
      intro: lines.filter((line) => !isListLine(line)).join(" "),
      items: marked.map(listItemText),
      after: "",
    };
  }

  const colon = text.match(/^([\s\S]*?):\s*([\s\S]+)$/);
  if (!colon) {
    return null;
  }

  const sentences = colon[2].trim().split(/(?<=\.)\s+(?=[A-Z])/);
  const items = splitNameItems(sentences[0] ?? "");
  if (items.length < 3 || !itemsLookLikeNames(items)) {
    return null;
  }

  return {
    intro: colon[1].trim(),
    items,
    after: sentences.slice(1).join(" "),
  };
}

function isListLine(line: string) {
  return /^[-*•]\s+\S/.test(line) || /^\d+\.\s+\S/.test(line);
}

function listItemText(line: string) {
  return line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").replace(/\.$/, "");
}

function splitNameItems(value: string) {
  return value
    .replace(/\.$/, "")
    .split(/,\s+(?:and\s+)?|\s+and\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function itemsLookLikeNames(items: string[]) {
  const named = items.filter(
    (item) =>
      item.split(/\s+/).length <= 8 &&
      !/\b(because|which|when|if they|and the)\b/i.test(item),
  );
  return named.length >= 3 && named.length >= items.length * 0.7;
}

function formatParagraph(paragraph: string) {
  let value = paragraph.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]+/g, " ").trim();
  if (!value) {
    return "";
  }

  value = value.replace(/ +([,;:])/g, "$1");
  value = value.replace(/([,;:])([A-Za-z])/g, "$1 $2");
  value = value.replace(/([!?])([A-Za-z])/g, "$1 $2");
  value = value.replace(/([.])([A-Z])/g, "$1 $2");
  value = value.replace(/\.{3,}/g, "...");
  value = value.replace(/([^.])\.{2}(?!\.)/g, "$1.");
  value = value.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead: string, letter: string) => {
    return `${lead}${letter.toUpperCase()}`;
  });

  if (!/[.!?]$/.test(value)) {
    value = `${value}.`;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

