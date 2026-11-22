"use client";
import type { Question } from "@itil5/core";
import { Tr } from "./Tr";
import { L } from "./Ui";

export function Explanation({ q }: { q: Question }) {
  return (
    <section className="explanation" aria-label="Source explanation">
      <h3><L k="review.sourceExplanation" /></h3>
      {q.sourceExplanation ? (
        <Tr k={q.i18n.explanation} as="div" className="expl-text">{q.sourceExplanation}</Tr>
      ) : (
        <L k="review.noSourceExplanation" as="p" className="muted" />
      )}
      <L k="review.whyNote" as="p" className="muted small" />
    </section>
  );
}
