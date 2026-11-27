import type { Attempt } from "./schema";

export interface WindowSummary {
  attempts: number;
  averagePercent: number | null;
  passRate: number | null;
}

export interface ProgressSummary {
  /** Everything here is computed from attempts the learner actually completed on this device. */
  source: "observed";
  examAttempts: number;
  passRate: number | null;
  latest: { score: number; total: number; percent: number; passed: boolean | null; submittedAt: number } | null;
  last7: WindowSummary;
  last30: WindowSummary;
  trend: { submittedAt: number; percent: number; passed: boolean | null; mode: string; examId?: string }[];
  byCategory: { category: number; correct: number; total: number; accuracy: number }[];
  frequentlyMissed: { questionId: string; timesWrong: number; timesSeen: number }[];
}

const pct = (a: Attempt) => (a.total ? (100 * a.score) / a.total : 0);

function windowSummary(exams: Attempt[], now: number, days: number): WindowSummary {
  const w = exams.filter((a) => now - a.submittedAt <= days * 86_400_000);
  if (!w.length) return { attempts: 0, averagePercent: null, passRate: null };
  return {
    attempts: w.length,
    averagePercent: w.reduce((s, a) => s + pct(a), 0) / w.length,
    passRate: w.filter((a) => a.passed).length / w.length,
  };
}

/** Pure function of stored attempts. Returns nulls (never placeholder numbers) when there is no data. */
export function summarize(attempts: Attempt[], now: number): ProgressSummary {
  // Graded exams: random 40-question exams and the six fixed exams (mistakes exams are reported separately).
  const exams = attempts.filter((a) => (a.mode === "exam" || a.mode === "fixed") && a.passed !== null).sort((a, b) => a.submittedAt - b.submittedAt);
  const latest = exams[exams.length - 1];
  const cat = new Map<number, { correct: number; total: number }>();
  const missed = new Map<string, { timesWrong: number; timesSeen: number }>();
  for (const a of attempts) {
    for (const i of a.items) {
      if (i.category != null) {
        const c = cat.get(i.category) ?? { correct: 0, total: 0 };
        c.total += 1;
        if (i.correct) c.correct += 1;
        cat.set(i.category, c);
      }
      const m = missed.get(i.questionId) ?? { timesWrong: 0, timesSeen: 0 };
      m.timesSeen += 1;
      if (!i.correct) m.timesWrong += 1;
      missed.set(i.questionId, m);
    }
  }
  return {
    source: "observed",
    examAttempts: exams.length,
    passRate: exams.length ? exams.filter((a) => a.passed).length / exams.length : null,
    latest: latest
      ? { score: latest.score, total: latest.total, percent: pct(latest), passed: latest.passed, submittedAt: latest.submittedAt }
      : null,
    last7: windowSummary(exams, now, 7),
    last30: windowSummary(exams, now, 30),
    trend: exams.map((a) => ({ submittedAt: a.submittedAt, percent: pct(a), passed: a.passed, mode: a.mode, ...(a.examId ? { examId: a.examId } : {}) })),
    byCategory: [...cat.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([category, v]) => ({ category, ...v, accuracy: v.total ? v.correct / v.total : 0 })),
    frequentlyMissed: [...missed.entries()]
      .filter(([, v]) => v.timesWrong > 0)
      .sort((a, b) => b[1].timesWrong - a[1].timesWrong || b[1].timesSeen - a[1].timesSeen)
      .slice(0, 10)
      .map(([questionId, v]) => ({ questionId, ...v })),
  };
}
