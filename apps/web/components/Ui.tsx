"use client";
import type { UiKey } from "@itil5/core";
import { t } from "@/lib/data";
import { Tr } from "./Tr";

/** A UI label in English with its Arabic overlay (hover/click/tap). */
export function L({ k, as = "span", className }: { k: UiKey; as?: "div" | "span" | "p" | "h2"; className?: string }) {
  const s = t.ui(k);
  return <Tr ar={s.ar} as={as} className={`inline ${className ?? ""}`}>{s.en}</Tr>;
}

/** Arabic tooltip text for buttons (buttons cannot host interactive translation text). */
export const arTitle = (k: UiKey) => t.ui(k).ar ?? undefined;
