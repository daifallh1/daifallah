"use client";
import { summarize } from "@itil5/core";
import { categoryLabel, lb } from "@/lib/data";
import { useStore } from "@/lib/store";
import { L } from "@/components/Ui";

const p = (x: number | null) => (x == null ? "No data yet" : `${Math.round(x * 100)}%`);
const n = (x: number | null) => (x == null ? "No data yet" : `${Math.round(x * 10) / 10}%`);

export default function ProgressPage() {
  const { attempts, ready } = useStore();
  if (!ready) return <div className="page"><p>Loading…</p></div>;
  const s = summarize(attempts, Date.now());
  return (
    <div className="page">
      <h1><L k="nav.progress" /></h1>
      <p className="muted">All figures below are observed results from attempts stored on this device. Nothing is estimated or sample data. Progress is not synced between devices.</p>
      <div className="stats">
        <div className="stat"><span>Full exams</span><b>{s.examAttempts}</b></div>
        <div className="stat"><span>Pass rate</span><b>{p(s.passRate)}</b></div>
        <div className="stat"><span>Latest</span><b>{s.latest ? `${s.latest.score}/${s.latest.total} ${s.latest.passed ? "PASS" : "FAIL"}` : "No data yet"}</b></div>
        <div className="stat"><span>Last 7 days avg</span><b>{n(s.last7.averagePercent)}</b><small>{s.last7.attempts} exam(s)</small></div>
        <div className="stat"><span>Last 30 days avg</span><b>{n(s.last30.averagePercent)}</b><small>{s.last30.attempts} exam(s)</small></div>
      </div>
      <h2>Trend</h2>
      {s.trend.length ? (
        <svg className="trend" viewBox={`0 0 ${Math.max(2, s.trend.length) * 40} 120`} role="img" aria-label="Exam score trend (percent)">
          <line x1="0" x2="100%" y1={120 - 65 * 1.1} y2={120 - 65 * 1.1} className="passline" />
          <polyline fill="none" className="trendline" points={s.trend.map((t, i) => `${i * 40 + 20},${120 - t.percent * 1.1}`).join(" ")} />
          {s.trend.map((t, i) => <circle key={i} cx={i * 40 + 20} cy={120 - t.percent * 1.1} r="4" className="trendpt"><title>{Math.round(t.percent)}%</title></circle>)}
        </svg>
      ) : <p className="muted">No data yet</p>}
      <h2><L k="progress.accuracyByCategory" /></h2>
      {s.byCategory.length ? (
        <table className="table"><thead><tr><th>Category</th><th>Correct</th><th>Answered</th><th>Accuracy</th></tr></thead>
          <tbody>{s.byCategory.map((c) => <tr key={c.category}><td>{categoryLabel(c.category)}</td><td>{c.correct}</td><td>{c.total}</td><td>{p(c.accuracy)}</td></tr>)}</tbody></table>
      ) : <p className="muted">No data yet</p>}
      <h2><L k="progress.frequentlyMissed" /></h2>
      {s.frequentlyMissed.length ? (
        <ol>{s.frequentlyMissed.map((m) => <li key={m.questionId}>{lb.byId.get(m.questionId)?.englishQuestion ?? m.questionId} — wrong {m.timesWrong}/{m.timesSeen}</li>)}</ol>
      ) : <p className="muted">No data yet</p>}
    </div>
  );
}
