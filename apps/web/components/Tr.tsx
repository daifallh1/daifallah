"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { t } from "@/lib/data";

/** Hover-reveal only on devices whose primary input can truly hover (not touch compatibility events). */
const canHover = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/**
 * English-first text with an on-demand Arabic overlay.
 *  - Mouse (fine pointer): hovering the English text reveals Arabic; clicking pins/unpins it.
 *  - Touch: tapping the English text toggles Arabic; tapping elsewhere closes it.
 *  - Keyboard: the text is focusable; Enter/Space toggles; a visible "ع" button does the same.
 * The Arabic panel is rendered in-flow directly below the English text, so it never covers
 * answer controls. It never selects an answer: answer selection lives in a separate control.
 */
export function Tr({ k, ar, children, as = "div", className = "" }: {
  k?: string | null;
  ar?: string | null;
  children: ReactNode;
  as?: "div" | "span" | "p" | "h2";
  className?: string;
}) {
  const arabic = ar ?? t.content(k ?? null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const lastPointer = useRef<string>("mouse");
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = pinned || hover;

  useEffect(() => {
    if (!pinned) return;
    // Touch: tapping elsewhere closes the panel. Close on a deferred click (not pointerdown) so the
    // panel never collapses under the finger mid-tap; the option's own row (incl. its radio) counts as inside.
    const close = (e: MouseEvent) => {
      if (lastPointer.current !== "touch" || !root.current) return;
      const scope = root.current.closest(".option") ?? root.current;
      if (scope.contains(e.target as Node)) return;
      setTimeout(() => setPinned(false), 0);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [pinned]);

  const Tag = as;
  return (
    <div ref={root} className={`tr ${open ? "tr-open" : ""} ${className}`}>
      <div className="tr-row">
        <Tag
          className="tr-en"
          lang="en"
          dir="ltr"
          tabIndex={0}
          role="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={undefined}
          title={arabic ? "Hover or click to show Arabic" : undefined}
          onPointerEnter={(e) => { lastPointer.current = e.pointerType; if (e.pointerType === "mouse" && canHover()) setHover(true); }}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(false); }}
          onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
          onClick={(e) => { e.stopPropagation(); setPinned((p) => !p); if (lastPointer.current !== "mouse") setHover(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned((p) => !p); } if (e.key === "Escape") setPinned(false); }}
        >
          {children}
        </Tag>
        <button
          type="button"
          className={`tr-btn ${pinned ? "on" : ""}`}
          aria-label={pinned ? "Hide Arabic translation" : "Show Arabic translation"}
          aria-pressed={pinned}
          onClick={(e) => { e.stopPropagation(); setPinned((p) => !p); }}
        >
          ع
        </button>
      </div>
      <div id={id} className="tr-ar" lang="ar" dir="rtl" hidden={!open} aria-live="polite">
        {arabic ?? <span className="muted">الترجمة غير متوفرة · Translation not available</span>}
      </div>
    </div>
  );
}
