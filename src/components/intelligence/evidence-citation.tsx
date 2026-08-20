"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { parseNamedEvidenceList } from "@/modules/intelligence/evidence-list";

const PREVIEW_COUNT = 8;

export function EvidenceCitations({ citations }: { citations: string[] }) {
  return (
    <ul className="space-y-3">
      {citations.map((citation, index) => (
        <li key={`${citation}-${index}`}>
          <EvidenceCitation citation={citation} />
        </li>
      ))}
    </ul>
  );
}

export function EvidenceCitation({ citation }: { citation: string }) {
  const list = parseNamedEvidenceList(citation);
  if (!list) {
    return <p>{citation}</p>;
  }

  return <NamedEvidenceListView list={list} />;
}

function NamedEvidenceListView({
  list,
}: {
  list: NonNullable<ReturnType<typeof parseNamedEvidenceList>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? list.items : list.items.slice(0, PREVIEW_COUNT);
  const hidden = list.items.length - visible.length;
  const heading =
    list.label[0] === list.label[0].toUpperCase()
      ? list.label
      : `${list.count} ${list.label}`;
  const scroll =
    expanded && list.items.length > 16
      ? "max-h-48 overflow-y-auto pr-1"
      : "";

  return (
    <div>
      <p>{heading}</p>
      <ul className={`mt-1.5 flex flex-wrap gap-1.5 ${scroll}`}>
        {visible.map((item, index) => (
          <li key={`${item}-${index}`}>
            <Badge>{item}</Badge>
          </li>
        ))}
      </ul>
      {list.items.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1.5 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          {expanded ? "See less" : `See ${hidden} more`}
        </button>
      ) : null}
    </div>
  );
}
