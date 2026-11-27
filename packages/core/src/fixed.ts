import type { LoadedBank } from "./bank";
import type { Attempt, FixedExam } from "./schema";
import { createSession, type ExamSession } from "./session";

/** The six fixed exams shipped in the bank (empty for older banks). */
export function fixedExams(lb: LoadedBank): FixedExam[] {
  return lb.bank.fixedExams ?? [];
}

export interface FixedExamStatus {
  exam: FixedExam;
  attempts: number;
  latest: Attempt | null;
  best: Attempt | null;
  inProgress: boolean;
}

export function fixedExamStatus(lb: LoadedBank, attempts: Attempt[], active: ExamSession | null): FixedExamStatus[] {
  return fixedExams(lb).map((exam) => {
    const mine = attempts.filter((a) => a.mode === "fixed" && a.examId === exam.examId).sort((a, b) => b.submittedAt - a.submittedAt);
    const best = mine.slice().sort((a, b) => b.score - a.score || b.submittedAt - a.submittedAt)[0] ?? null;
    return { exam, attempts: mine.length, latest: mine[0] ?? null, best, inProgress: active?.mode === "fixed" && active.examId === exam.examId };
  });
}

/** Start a fixed exam: same questions every time (order shuffled per attempt), 60 minutes, pass 65%. */
export function createFixedExamSession(lb: LoadedBank, examId: string, now: number, seed: number): ExamSession {
  const exam = fixedExams(lb).find((e) => e.examId === examId);
  if (!exam) throw new Error(`Unknown fixed exam ${examId}`);
  const ids = exam.questionIds.slice();
  let x = seed >>> 0;
  for (let i = ids.length - 1; i > 0; i--) {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    const j = x % (i + 1);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return createSession({
    lb, questionIds: ids, mode: "fixed", now, seed, blueprintCompliant: false,
    durationMs: exam.durationMinutes * 60 * 1000, examId: exam.examId, passMark: exam.passMark,
  });
}
