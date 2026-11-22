"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  answer, formatDuration, goTo, isExpired, progress, remainingMs, submit, toggleFlag, type ExamSession, type OptionLabel,
} from "@itil5/core";
import { lb } from "@/lib/data";
import { useStore } from "@/lib/store";
import { QuestionView } from "./QuestionView";
import { arTitle, L } from "./Ui";

export function ExamRunner({ initial }: { initial: ExamSession }) {
  const { storage, refresh } = useStore();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const submitted = useRef(false);

  const persist = useCallback((next: ExamSession) => { setS(next); void storage.setActiveSession(next); }, [storage]);

  const finish = useCallback(async (by: "user" | "timer") => {
    if (submitted.current) return;
    submitted.current = true;
    const attempt = submit(lb, s, Date.now(), by);
    await storage.saveAttempt(attempt);
    await storage.setActiveSession(null);
    await refresh();
    router.push(`/results/?id=${encodeURIComponent(attempt.attemptId)}${by === "timer" ? "&timeout=1" : ""}`);
  }, [s, storage, refresh, router]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { if (isExpired(s, now)) void finish("timer"); }, [now, s, finish]);

  const qid = s.questionIds[s.current]!;
  const q = lb.byId.get(qid)!;
  const p = progress(s);
  const rem = remainingMs(s, now);
  const low = rem !== null && rem < 5 * 60_000;

  const select = (l: OptionLabel) => persist(answer(s, qid, l));

  return (
    <div className="exam">
      <div className="exam-bar" role="region" aria-label="Exam status">
        <span className="pos" title={arTitle("exam.question")}>Question {s.current + 1} / {s.questionIds.length}</span>
        <span className="counts">{p.answered} answered · {p.unanswered} unanswered · {p.flagged} flagged</span>
        {rem !== null ? (
          <span className={`timer ${low ? "low" : ""}`} role="timer" aria-live={low ? "assertive" : "off"} aria-label={`Time remaining ${formatDuration(rem)}`}>
            ⏱ {formatDuration(rem)}{s.extendedTime ? " (75-min extended)" : ""}
          </span>
        ) : <span className="timer">Untimed practice</span>}
      </div>
      <div className="exam-body">
        <section className="exam-main" aria-label={`Question ${s.current + 1}`}>
          <QuestionView key={qid} q={q} name={`q-${qid}`} selected={s.answers[qid]} onSelect={select} />
          <div className="exam-actions">
            <button className="btn" onClick={() => persist(goTo(s, s.current - 1))} disabled={s.current === 0} title={arTitle("exam.previous")}>← Previous</button>
            <button className={`btn ${s.flags[qid] ? "flagged" : ""}`} onClick={() => persist(toggleFlag(s, qid))} aria-pressed={!!s.flags[qid]} title={arTitle("exam.flag")}>
              {s.flags[qid] ? "⚑ Flagged" : "⚐ Flag for review"}
            </button>
            {s.current < s.questionIds.length - 1 ? (
              <button className="btn primary" onClick={() => persist(goTo(s, s.current + 1))} title={arTitle("exam.next")}>Next →</button>
            ) : (
              <button className="btn primary" onClick={() => setConfirming(true)} title={arTitle("exam.submit")}>Review &amp; submit</button>
            )}
          </div>
          <button className="btn nav-toggle" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen} aria-controls="navigator">
            {navOpen ? "Hide" : "Show"} question navigator
          </button>
        </section>
        <aside id="navigator" className={`navigator ${navOpen ? "open" : ""}`} aria-label="Question navigator">
          <h2 className="small"><L k="exam.navigator" /></h2>
          <ol className="nav-grid">
            {s.questionIds.map((id, i) => (
              <li key={id}>
                <button
                  className={`nav-cell ${s.answers[id] ? "answered" : ""} ${s.flags[id] ? "flag" : ""} ${i === s.current ? "current" : ""}`}
                  onClick={() => { persist(goTo(s, i)); setNavOpen(false); }}
                  aria-label={`Question ${i + 1}, ${s.answers[id] ? "answered" : "unanswered"}${s.flags[id] ? ", flagged" : ""}`}
                  aria-current={i === s.current ? "step" : undefined}
                >{i + 1}</button>
              </li>
            ))}
          </ol>
          <p className="legend small"><span className="nav-cell answered">■</span> answered <span className="nav-cell flag">■</span> flagged <span className="nav-cell">■</span> unanswered</p>
          <button className="btn danger block" onClick={() => setConfirming(true)}>Submit exam…</button>
        </aside>
      </div>
      {confirming && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirming(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="confirm-title"><L k="exam.submit" /></h2>
            <L k="exam.confirmSubmit" as="p" />
            {p.unanswered > 0 && <p className="warn">{p.unanswered} question(s) unanswered: {s.questionIds.map((id, i) => (s.answers[id] ? null : i + 1)).filter(Boolean).join(", ")}</p>}
            {p.flagged > 0 && <p>{p.flagged} question(s) flagged for review.</p>}
            <div className="row">
              <button className="btn" autoFocus onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn danger" onClick={() => void finish("user")}>Submit now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
