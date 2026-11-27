import type { LoadedBank } from "./bank";
import type { Attempt, AttemptMode, OptionLabel } from "./schema";

/**
 * Serializable in-progress exam. All timing derives from `startedAt` + `durationMs`, so a session
 * restored after a refresh or app restart keeps counting down correctly (and expires if time passed).
 */
export interface ExamSession {
  sessionId: string;
  mode: AttemptMode;
  bankVersion: string;
  questionIds: string[];
  answers: Record<string, OptionLabel | undefined>;
  flags: Record<string, boolean | undefined>;
  current: number;
  startedAt: number;
  /** null = untimed (mistakes practice). */
  durationMs: number | null;
  extendedTime: boolean;
  blueprintCompliant: boolean;
  seed: number;
  /** Fixed exam id when mode is "fixed". */
  examId?: string;
  /** Pass mark for this session; when absent a full 40-question exam uses the bank pass mark. */
  passMark?: number;
}

export const STANDARD_DURATION_MS = 60 * 60 * 1000;
export const EXTENDED_DURATION_MS = 75 * 60 * 1000;

export function newId(prefix: string, now: number, rand: () => number = Math.random): string {
  return `${prefix}-${now.toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;
}

export function createSession(args: {
  lb: LoadedBank;
  questionIds: string[];
  mode: AttemptMode;
  now: number;
  extendedTime?: boolean;
  timed?: boolean;
  blueprintCompliant: boolean;
  seed: number;
  /** Explicit duration (overrides standard/extended), e.g. 90 s per question for the mistakes exam. */
  durationMs?: number;
  examId?: string;
  passMark?: number;
}): ExamSession {
  for (const id of args.questionIds) {
    const q = args.lb.byId.get(id);
    if (!q) throw new Error(`Unknown question ${id}`);
    if (q.audit.contentStatus !== "approved") throw new Error(`Question ${id} is not approved and cannot be served`);
  }
  const timed = args.timed ?? true;
  return {
    sessionId: newId(args.mode, args.now),
    mode: args.mode,
    bankVersion: args.lb.bank.bankVersion,
    questionIds: args.questionIds.slice(),
    answers: {},
    flags: {},
    current: 0,
    startedAt: args.now,
    durationMs: !timed ? null : args.durationMs ?? (args.extendedTime ? EXTENDED_DURATION_MS : STANDARD_DURATION_MS),
    extendedTime: !!args.extendedTime,
    blueprintCompliant: args.blueprintCompliant,
    seed: args.seed,
    ...(args.examId ? { examId: args.examId } : {}),
    ...(args.passMark != null ? { passMark: args.passMark } : {}),
  };
}

export function answer(s: ExamSession, questionId: string, label: OptionLabel): ExamSession {
  if (!s.questionIds.includes(questionId)) throw new Error("question not in session");
  return { ...s, answers: { ...s.answers, [questionId]: label } };
}

export function clearAnswer(s: ExamSession, questionId: string): ExamSession {
  const answers = { ...s.answers };
  delete answers[questionId];
  return { ...s, answers };
}

export function toggleFlag(s: ExamSession, questionId: string): ExamSession {
  return { ...s, flags: { ...s.flags, [questionId]: !s.flags[questionId] } };
}

export function goTo(s: ExamSession, index: number): ExamSession {
  const current = Math.max(0, Math.min(s.questionIds.length - 1, index));
  return { ...s, current };
}

export function remainingMs(s: ExamSession, now: number): number | null {
  if (s.durationMs == null) return null;
  return Math.max(0, s.startedAt + s.durationMs - now);
}

export function isExpired(s: ExamSession, now: number): boolean {
  const r = remainingMs(s, now);
  return r !== null && r <= 0;
}

export function progress(s: ExamSession) {
  const answered = s.questionIds.filter((id) => s.answers[id]).length;
  const flagged = s.questionIds.filter((id) => s.flags[id]).length;
  return { answered, unanswered: s.questionIds.length - answered, flagged, total: s.questionIds.length };
}

/** Grade and freeze the session into an immutable Attempt record. One mark per correct answer, no negative marking. */
export function submit(lb: LoadedBank, s: ExamSession, now: number, by: "user" | "timer"): Attempt {
  const items = s.questionIds.map((id) => {
    const q = lb.byId.get(id);
    if (!q) throw new Error(`Unknown question ${id}`);
    const selected = s.answers[id] ?? null;
    return {
      questionId: id,
      selected,
      sourceAnswerKey: q.sourceAnswerKey,
      correct: selected === q.sourceAnswerKey,
      flagged: !!s.flags[id],
      category: q.audit.syllabusCategory,
      snapshot: {
        englishQuestion: q.englishQuestion,
        englishOptions: q.englishOptions,
        sourceExplanation: q.sourceExplanation,
        sourcePage: q.sourcePage,
        printedQuestionNumber: q.printedQuestionNumber,
      },
    };
  });
  const score = items.filter((i) => i.correct).length;
  const end = s.durationMs != null ? Math.min(now, s.startedAt + s.durationMs) : now;
  const isFullExam = s.mode === "exam" && s.questionIds.length === lb.bank.examSpec.questions;
  const passMark = s.passMark ?? (isFullExam ? lb.bank.examSpec.passMark : undefined);
  return {
    attemptId: s.sessionId,
    mode: s.mode,
    bankVersion: s.bankVersion,
    startedAt: s.startedAt,
    submittedAt: end,
    durationMs: s.durationMs ?? 0,
    elapsedMs: end - s.startedAt,
    submittedBy: by,
    blueprintCompliant: s.blueprintCompliant,
    ...(s.examId ? { examId: s.examId } : {}),
    ...(passMark != null ? { passMark } : {}),
    items,
    score,
    total: items.length,
    passed: passMark != null ? score >= passMark : null,
  };
}

export function categoryBreakdown(a: Attempt): Record<number, { correct: number; total: number }> {
  const out: Record<number, { correct: number; total: number }> = {};
  for (const i of a.items) {
    const c = i.category ?? 0;
    out[c] ??= { correct: 0, total: 0 };
    out[c].total += 1;
    if (i.correct) out[c].correct += 1;
  }
  return out;
}

/** Pass mark for a given percentage, rounded up (65% of 42 = 28). */
export function passMarkFor(total: number, percent = 65): number {
  return Math.ceil((percent * total) / 100 - 1e-9);
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
