"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { latestMarks, mistakeStats, wrongItems, type StudyMark } from "@itil5/core";
import { lb } from "@/lib/data";
import { useStore } from "@/lib/store";
import { QuestionView } from "@/components/QuestionView";
import { Explanation } from "@/components/Explanation";
import { SourceRef } from "@/components/SourceRef";
import { Tr } from "@/components/Tr";
import { L } from "@/components/Ui";

function Review() {
  const params = useSearchParams();
  const { attempts, marks, storage, refresh, ready } = useStore();
  const [sel, setSel] = useState<string | null>(params.get("id"));
  const latest = useMemo(() => latestMarks(marks), [marks]);
  const stats = useMemo(() => new Map(mistakeStats(attempts, marks).map((s) => [s.questionId, s])), [attempts, marks]);
  if (!ready) return <p>Loading…</p>;
  if (!attempts.length) return <L k="review.none" as="p" />;
  const a = attempts.find((x) => x.attemptId === sel) ?? attempts[0]!;
  const wrong = wrongItems(a);
  const mark = async (questionId: string, m: StudyMark) => { await storage.addMark({ questionId, mark: m, at: Date.now() }); await refresh(); };
  return (
    <>
      <label className="field">Attempt{" "}
        <select value={a.attemptId} onChange={(e) => setSel(e.target.value)}>
          {attempts.map((x) => <option key={x.attemptId} value={x.attemptId}>{new Date(x.submittedAt).toLocaleString()} · {x.mode} · {x.score}/{x.total}</option>)}
        </select>
      </label>
      <p>{wrong.length} incorrect or unanswered item(s) in this attempt.</p>
      {wrong.length === 0 && <L k="review.none" as="p" />}
      <ol className="review-list">
        {wrong.map((w) => {
          const q = lb.byId.get(w.questionId);
          const st = stats.get(w.questionId);
          return (
            <li key={w.questionId} className="review-item" data-testid="wrong-item">
              {q ? (
                <QuestionView q={q} name={`r-${a.attemptId}-${w.questionId}`} selected={w.selected} feedback={{ showKey: true }} disabled />
              ) : (
                <p className="warn">This question is no longer in the current bank; showing the stored snapshot: {w.snapshot.englishQuestion}</p>
              )}
              <dl className="answers">
                <dt><L k="review.yourAnswer" /></dt>
                <dd>{w.selected ? <Tr k={q?.i18n.options[w.selected]} as="span" className="inline">{w.selected}. {w.snapshot.englishOptions.find((o) => o.label === w.selected)?.text}</Tr> : <L k="review.noAnswer" />}</dd>
                <dt><L k="review.correctAnswer" /></dt>
                <dd><Tr k={q?.i18n.options[w.sourceAnswerKey]} as="span" className="inline">{w.sourceAnswerKey}. {w.snapshot.englishOptions.find((o) => o.label === w.sourceAnswerKey)?.text}</Tr></dd>
              </dl>
              {q && <Explanation q={q} />}
              {q && <SourceRef q={q} />}
              <div className="marks" role="group" aria-label="Study status">
                <span className="small muted">Missed {st?.timesWrong ?? 1}× · seen {st?.timesSeen ?? 1}× · status: {latest.get(w.questionId) ?? "—"}</span>
                {(["studied", "confusing", "mastered"] as StudyMark[]).map((m) => (
                  <button key={m} className={`btn small ${latest.get(w.questionId) === m ? "on" : ""}`} onClick={() => void mark(w.questionId, m)} aria-pressed={latest.get(w.questionId) === m}>
                    {m === "studied" ? "Studied" : m === "confusing" ? "Still confusing" : "Mastered"}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
export default function ReviewPage() {
  return <div className="page"><h1><L k="nav.review" /></h1><Suspense fallback={<p>Loading…</p>}><Review /></Suspense></div>;
}
