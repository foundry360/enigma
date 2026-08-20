import { peelLayerPrefix } from "@/modules/intelligence/evidence-expand";

export type NamedEvidenceList = {
  label: string;
  count: number;
  items: string[];
};

export function parseNamedEvidenceList(
  citation: string,
): NamedEvidenceList | null {
  const candidates = [citation, peelLayerPrefix(citation).fact];
  for (const candidate of candidates) {
    const counted = parseCountedList(candidate);
    if (counted) {
      return counted;
    }
  }
  for (const candidate of candidates) {
    const labeled = parseLabeledList(candidate);
    if (labeled) {
      return labeled;
    }
  }
  return null;
}

function parseCountedList(value: string): NamedEvidenceList | null {
  const fact = unwrap(value);
  const counted = fact.match(/^(\d+)\s+([^:]+?):\s*(.+)$/);
  if (!counted) {
    return null;
  }

  const items = splitNameItems(counted[3]);
  if (items.length < 2) {
    return null;
  }

  return {
    label: counted[2].trim(),
    count: Number(counted[1]),
    items,
  };
}

function parseLabeledList(value: string): NamedEvidenceList | null {
  const fact = unwrap(value);
  const labeled = fact.match(/^([^:]{2,48}):\s*(.+)$/);
  if (!labeled) {
    return null;
  }

  const items = splitNameItems(labeled[2]);
  if (!itemsLookLikeNames(items)) {
    return null;
  }

  return {
    label: labeled[1].trim(),
    count: items.length,
    items,
  };
}

function unwrap(value: string) {
  return value.replace(/\.$/, "").trim();
}

function splitNameItems(value: string) {
  const trimmed = unwrap(value);
  if (trimmed.includes(";")) {
    const parts = trimmed
      .split(/\s*;\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parts;
    }
  }

  return trimmed
    .split(/,\s+(?:and\s+)?|\s+and\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function itemsLookLikeNames(items: string[]) {
  if (items.length < 2) {
    return false;
  }

  const named = items.filter(
    (item) =>
      item.split(/\s+/).length <= 12 &&
      !/\b(because|which|when|if they|and the)\b/i.test(item),
  );
  return named.length >= items.length * 0.7;
}
