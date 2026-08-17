"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { searchWorkspaceAction } from "@/app/actions/search";
import type { SearchHit, SearchResults } from "@/lib/search";

const emptyResults: SearchResults = {
  organizations: [],
  projects: [],
  assessments: [],
};

const groups: { key: keyof SearchResults; label: string }[] = [
  { key: "organizations", label: "Organizations" },
  { key: "projects", label: "Projects" },
  { key: "assessments", label: "Assessments" },
];

function hasHits(results: SearchResults) {
  return groups.some((group) => results[group.key].length > 0);
}

export function GlobalSearch() {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<SearchResults>(emptyResults);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults(emptyResults);
      setPending(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setPending(true);
    const timer = window.setTimeout(async () => {
      const next = await searchWorkspaceAction(value);
      if (requestRef.current === requestId) {
        setResults(next);
        setPending(false);
        setOpen(true);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query]);

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <label className="sr-only" htmlFor="global-search">
        Search organizations, projects, and assessments
      </label>
      <div className="flex h-8 w-56 items-center gap-2 rounded-md border border-border bg-transparent px-2 sm:w-72">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-muted"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          value={query}
          placeholder="Search"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          className="h-full w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-placeholder"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) {
              setOpen(true);
            }
          }}
        />
        <kbd className="hidden rounded border border-border px-1 text-[10px] text-muted sm:inline">
          ⌘K
        </kbd>
      </div>
      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-80 rounded-md border border-border bg-surface p-1 shadow-sm"
        >
          {pending && !hasHits(results) ? (
            <p className="px-2.5 py-2 text-sm text-muted">Searching…</p>
          ) : !hasHits(results) ? (
            <p className="px-2.5 py-2 text-sm text-muted">No matches</p>
          ) : (
            groups.map((group) => {
              const hits = results[group.key];
              if (hits.length === 0) {
                return null;
              }

              return (
                <section key={group.key} className="py-1">
                  <p className="px-2.5 py-1 text-[11px] font-medium text-muted">
                    {group.label}
                  </p>
                  {hits.map((hit) => (
                    <ResultLink
                      key={`${hit.type}-${hit.id}`}
                      hit={hit}
                      onSelect={() => setOpen(false)}
                    />
                  ))}
                </section>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultLink({
  hit,
  onSelect,
}: {
  hit: SearchHit;
  onSelect: () => void;
}) {
  return (
    <Link
      href={hit.href}
      role="option"
      className="block rounded-md px-2.5 py-1.5 hover:bg-surface-2"
      onClick={onSelect}
    >
      <p className="truncate text-sm">{hit.title}</p>
      <p className="truncate text-xs text-muted">{hit.subtitle}</p>
    </Link>
  );
}
