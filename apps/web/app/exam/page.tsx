"use client";
import { useState } from "react";
import { createSession, generateExam, randomSeed, type GeneratedExam } from "@itil5/core";
import { categoryLabel, lb } from "@/lib/data";
import { useStore } from "@/lib/store";
import { ExamRunner } from "@/components/ExamRunner";
import { L } from "@/components/Ui";

export default function ExamPage() {
  const { activeSession, storage, refresh, ready } = useStore();
  const [extended, setExtended] = useState(false);
  const [preview, setPreview] = useState<GeneratedExam | null>(null);
  if (!ready) return <div className="page"><p>Loading…</p></div>;
  if (activeSession) return <ExamRunner key={activeSession.sessionId} initial={activeSession} />;

  const start = async () => {
    const seed = randomSeed();
    const e = generateExam(lb, { seed });
    setPreview(e);
    const s = createSession({ lb, questionIds: e.questionIds, mode: "exam", now: Date.now(), extendedTime: extended, blueprintCompliant: e.blueprint.fullyCompliant, seed });
    await storage.setActiveSession(s);
    await refresh();
  };
  return (
    <div className="page narrow">
      <h1><L k="nav.exam" /></h1>
      <ul className="facts">
        <li>40 questions, one mark each, no negative marking</li>
        <li>60-minute countdown; automatic submission when time expires</li>
        <li>Pass mark: 26 of 40 (65%)</li>
        <li>Four options per question, one answer; option order exactly as in the source</li>
        <li><L k="exam.closedBook" /></li>
        <li>Question selection follows the syllabus blueprint [12, 4, 4, 16, 2, 1, 1] and 16 BL1 / 24 BL2 when the audited bank supports it.</li>
      </ul>
      <label className="check">
        <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} />
        <span>Use extended time (75 minutes). Only for candidates taking the exam in a language that is not their native or working language.</span>
      </label>
      <button className="btn primary big" onClick={() => void start()}>Start exam ({extended ? 75 : 60} minutes)</button>
      {preview && !preview.blueprint.fullyCompliant && (
        <div className="callout warn"><strong>Not fully blueprint-compliant.</strong> {preview.blueprint.problems.join(" ")}</div>
      )}
      <details className="small">
        <summary>Blueprint targets</summary>
        <ul>{lb.bank.categories.map((c) => <li key={c.id}>{categoryLabel(c.id)}: {c.questions} questions ({(c.weight * 100).toFixed(1)}%)</li>)}</ul>
        <p className="muted">Category 6 (ITIL and AI) currently has only one eligible source question, so it appears in every exam.</p>
      </details>
    </div>
  );
}
