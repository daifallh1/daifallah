"use client";
import { useMemo, useState } from "react";
import { checkStudyAnswer, studyQuestions, type OptionLabel } from "@itil5/core";
import { categoryLabel, lb } from "@/lib/data";
import { QuestionView } from "@/components/QuestionView";
import { Explanation } from "@/components/Explanation";
import { SourceRef } from "@/components/SourceRef";
import { L } from "@/components/Ui";

export default function StudyPage() {
  const [cat, setCat] = useState<number | "all">("all");
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<OptionLabel | null>(null);
  const list = useMemo(() => studyQuestions(lb, cat), [cat]);
  const q = list[Math.min(i, list.length - 1)];
  const go = (n: number) => { setI(Math.max(0, Math.min(list.length - 1, n))); setSel(null); };
  const result = q && sel ? checkStudyAnswer(q, sel) : null;
  return (
    <div className="page">
      <h1><L k="nav.study" /></h1>
      <div className="row wrap">
        <label className="field"><L k="study.category" />{" "}
          <select value={String(cat)} onChange={(e) => { setCat(e.target.value === "all" ? "all" : Number(e.target.value)); setI(0); setSel(null); }}>
            <option value="all">All approved ({lb.approved.length})</option>
            {lb.bank.categories.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.id)} ({studyQuestions(lb, c.id).length})</option>)}
          </select>
        </label>
        <span className="muted">Untimed · feedback after each answer · only approved source questions</span>
      </div>
      {q ? (
        <>
          <p className="small muted">Question {Math.min(i, list.length - 1) + 1} of {list.length}</p>
          <QuestionView key={q.questionId} q={q} name={`s-${q.questionId}`} selected={sel} onSelect={setSel} feedback={sel ? { showKey: true } : null} />
          {result && <p className={`feedback ${result.correct ? "ok" : "bad"}`} role="status">{result.correct ? "Correct" : `Incorrect — the source key is ${result.sourceAnswerKey}`}</p>}
          {sel && <Explanation q={q} />}
          {sel && <SourceRef q={q} />}
          <div className="row">
            <button className="btn" onClick={() => go(i - 1)} disabled={i === 0}>← Previous</button>
            <button className="btn primary" onClick={() => go(i + 1)} disabled={i >= list.length - 1}>Next →</button>
          </div>
        </>
      ) : <p>No approved questions in this category.</p>}
    </div>
  );
}
