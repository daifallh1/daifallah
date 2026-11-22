"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { categoryBreakdown, formatDuration } from "@itil5/core";
import { categoryLabel } from "@/lib/data";
import { useStore } from "@/lib/store";
import { L } from "@/components/Ui";

function Results() {
  const params = useSearchParams();
  const { attempts, ready } = useStore();
  if (!ready) return <p>Loading…</p>;
  const a = attempts.find((x) => x.attemptId === params.get("id")) ?? attempts[0];
  if (!a) return <p>No attempt found.</p>;
  const pct = a.total ? Math.round((1000 * a.score) / a.total) / 10 : 0;
  const cats = categoryBreakdown(a);
  return (
    <>
      {params.get("timeout") && <div className="callout warn"><L k="exam.timeUp" /></div>}
      <h1>{a.mode === "exam" ? "Exam result" : "Mistakes practice result"}</h1>
      <div className={`result ${a.passed === null ? "" : a.passed ? "pass" : "fail"}`} data-testid="result">
        <div className="big-score"><span data-testid="score">{a.score}</span> / {a.total}</div>
        <div>{pct}%</div>
        {a.passed !== null && <div className="verdict">{a.passed ? "PASS" : "FAIL"} <span className="muted small">(pass mark 26/40)</span></div>}
        <div className="muted">Elapsed {formatDuration(a.elapsedMs)} · submitted by {a.submittedBy === "timer" ? "timer (auto-submit)" : "you"}</div>
        {a.mode === "exam" && <div className="muted small">{a.blueprintCompliant ? "Blueprint-compliant attempt" : "Attempt was NOT fully blueprint-compliant"}</div>}
      </div>
      <h2><L k="result.byCategory" /></h2>
      <table className="table">
        <thead><tr><th>Category</th><th>Correct</th><th>Total</th></tr></thead>
        <tbody>
          {Object.entries(cats).map(([c, v]) => <tr key={c}><td>{categoryLabel(Number(c))}</td><td>{v.correct}</td><td>{v.total}</td></tr>)}
        </tbody>
      </table>
      <p className="row">
        <Link className="btn primary" href={`/review/?id=${encodeURIComponent(a.attemptId)}`}>Review wrong answers ({a.total - a.score})</Link>
        <Link className="btn" href="/exam/">New exam</Link>
      </p>
    </>
  );
}
export default function ResultsPage() {
  return <div className="page narrow"><Suspense fallback={<p>Loading…</p>}><Results /></Suspense></div>;
}
