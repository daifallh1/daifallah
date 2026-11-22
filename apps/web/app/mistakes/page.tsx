"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { buildMistakesPractice, createSession, mistakeStats, randomSeed } from "@itil5/core";
import { lb } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Tr } from "@/components/Tr";
import { L } from "@/components/Ui";

export default function MistakesPage() {
  const { attempts, marks, storage, refresh, ready, activeSession } = useStore();
  const router = useRouter();
  const stats = useMemo(() => mistakeStats(attempts, marks).filter((s) => s.timesWrong > 0).sort((a, b) => b.timesWrong - a.timesWrong), [attempts, marks]);
  if (!ready) return <div className="page"><p>Loading…</p></div>;
  const start = async () => {
    const seed = randomSeed();
    const ids = buildMistakesPractice(lb, attempts, marks, { now: Date.now(), size: 20, seed });
    if (!ids.length) return;
    const s = createSession({ lb, questionIds: ids, mode: "mistakes", now: Date.now(), timed: false, blueprintCompliant: false, seed });
    await storage.setActiveSession(s);
    await refresh();
    router.push("/exam/");
  };
  return (
    <div className="page">
      <h1><L k="nav.mistakes" /></h1>
      <p>Practice sets are drawn <strong>only</strong> from questions you previously answered incorrectly — no new questions or options. Items are prioritised by how often and how recently you missed them; items marked “Mastered” are skipped.</p>
      {activeSession && <p className="callout">Finish or submit the session in progress first (Exam tab).</p>}
      {stats.length === 0 ? <L k="mistakes.empty" as="p" /> : (
        <>
          <button className="btn primary big" onClick={() => void start()} disabled={!!activeSession}>Start mistakes practice (up to 20, untimed)</button>
          <table className="table">
            <thead><tr><th>Question</th><th>Times wrong</th><th>Seen</th><th>Correct since last miss</th><th>Status</th></tr></thead>
            <tbody>
              {stats.map((s) => {
                const q = lb.byId.get(s.questionId);
                return (
                  <tr key={s.questionId}>
                    <td>{q ? <Tr k={q.i18n.question} as="span" className="inline">{q.englishQuestion}</Tr> : s.questionId}</td>
                    <td>{s.timesWrong}</td><td>{s.timesSeen}</td><td>{s.timesRightSinceLastWrong}</td><td>{s.latestMark ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
