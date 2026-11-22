import type { Question } from "@itil5/core";
import { categoryLabel } from "@/lib/data";

export function SourceRef({ q }: { q: Question }) {
  return (
    <p className="source-ref">
      Source: <cite>{q.sourceDocument}</cite>, page {q.sourcePagesSpanned.join("–")} · printed Q{q.printedQuestionNumber} ·
      occurrence #{q.sourceOrdinal} · <code>{q.questionId}</code>
      {q.sourceReferenceText ? <> · citation in source: “{q.sourceReferenceText}” (not independently verified)</> : null}
      <br />
      <span className="muted">
        Audit metadata: {categoryLabel(q.audit.syllabusCategory)} · criterion {q.audit.syllabusCriterion ?? "—"} · Bloom level{" "}
        {q.audit.bloomLevel ?? "—"} · {q.audit.questionStyle} · confidence {q.audit.confidence}
      </span>
    </p>
  );
}
