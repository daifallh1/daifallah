"use client";
import Link from "next/link";
import { lb } from "@/lib/data";
import { useStore } from "@/lib/store";
import { L } from "@/components/Ui";
import auditJson from "@itil5/content/web/import-audit.json";

export default function Home() {
  const { activeSession, attempts, ready } = useStore();
  const a = auditJson as { statusCounts: Record<string, number>; examEligibleOccurrences: number; blueprint: { fullyCompliantExamPossible: boolean } };
  return (
    <div className="page">
      <h1><L k="app.title" /></h1>
      <L k="translate.hint" as="p" className="lead" />
      {ready && activeSession && (
        <div className="callout">
          <strong>An exam is in progress.</strong> <Link className="btn primary" href="/exam/">Resume</Link>
        </div>
      )}
      <div className="cards">
        <Link className="card" href="/exam/"><h2>Full Exam</h2><p>40 questions · 60 minutes · pass 26/40 (65%) · closed book · blueprint-balanced.</p></Link>
        <Link className="card" href="/study/"><h2>Study Mode</h2><p>Browse approved source questions by syllabus category with immediate feedback.</p></Link>
        <Link className="card" href="/review/"><h2>Wrong Answers Review</h2><p>Your answer, the source key and the source explanation for each miss.</p></Link>
        <Link className="card" href="/mistakes/"><h2>Mistakes-Only Practice</h2><p>Re-practice only questions you previously got wrong, prioritised by recurrence.</p></Link>
        <Link className="card" href="/progress/"><h2>Progress</h2><p>{ready ? `${attempts.length} stored attempt(s) on this device.` : "Loading…"}</p></Link>
        <Link className="card" href="/audit/"><h2>Import Audit</h2><p>{lb.bank.questionCount} source occurrences · {a.statusCounts.approved} approved · {a.examEligibleOccurrences} exam-eligible · blueprint {a.blueprint.fullyCompliantExamPossible ? "achievable" : "NOT achievable"}.</p></Link>
      </div>
      <L k="app.disclaimer" as="p" className="muted small" />
    </div>
  );
}
