"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const INTELLIGENCE_HEADER_ACTIONS_ID = "intelligence-header-actions";

export function IntelligenceHeaderActions() {
  return (
    <div
      id={INTELLIGENCE_HEADER_ACTIONS_ID}
      className="flex items-center gap-2"
    />
  );
}

export function IntelligenceHeaderPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(INTELLIGENCE_HEADER_ACTIONS_ID));
  }, []);

  if (!target) {
    return null;
  }

  return createPortal(children, target);
}
