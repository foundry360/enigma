const DECIMAL = "\u0000";

export function looksLikeAskDump(text: string) {
  return (
    /Evidence:\s+\S+:/.test(text) ||
    (/\(\s*strong\s*\)/i.test(text) && /\(\s*weak\s*\)/i.test(text))
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
    .map((paragraph) => formatParagraph(paragraph))
    .filter(Boolean);

  const joined =
    paragraphs.length > 0
      ? paragraphs.join("\n\n")
      : formatParagraph(protectedText);

  return joined.replaceAll(DECIMAL, ".");
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

