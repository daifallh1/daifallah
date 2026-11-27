import type { LoadedBank } from "./bank";
import type { Attempt, MarkEvent } from "./schema";
import { latestMarks } from "./review";
import { createRng, shuffle } from "./rng";
import { passMarkFor } from "./session";

/** Seconds allowed per question in the mistakes exam. */
export const MISTAKES_SECONDS_PER_QUESTION = 90;
/** Consecutive correct answers (after the latest miss) that take a question off the mistakes list. */
export const MISTAKES_CLEAR_STREAK = 2;

export type MistakeState = "active" | "oneCorrect" | "cleared" | "markedMastered";

export interface MistakeEntry {
  /** Canonical question id (identical duplicates are folded into the kept copy). */
  questionId: string;
  state: MistakeState;
  timesWrong: number;
  timesSeen: number;
  /** Correct answers in a row since the latest wrong answer. */
  streak: number;
  lastWrongAt: number;
  category: number | null;
}

export interface MistakeQueue {
  /** Still to fix: in the next mistakes exam (includes `oneCorrect`). */
  toFix: MistakeEntry[];
  /** Answered correctly once since the last miss; still in the list. */
  oneCorrect: MistakeEntry[];
  /** Left the list: two correct answers in a row, or marked "mastered" in Study/Review. */
  mastered: MistakeEntry[];
  all: MistakeEntry[];
}

/** Map an id to the copy that is still served (identical duplicates point to their kept copy). */
export function canonicalId(lb: LoadedBank, id: string): string {
  let cur = id;
  for (let i = 0; i < 4; i++) {
    const next = lb.byId.get(cur)?.audit.duplicateOf;
    if (!next) break;
    cur = next;
  }
  return cur;
}

/**
 * Every question the learner has ever answered WRONG (a selected wrong option; blanks are not counted),
 * replayed in time order across all attempts (random, fixed and mistakes exams).
 * A question leaves the list after MISTAKES_CLEAR_STREAK correct answers in a row, or when the
 * learner marks it "mastered". A new wrong answer puts it back with the streak reset.
 */
export function mistakeQueue(lb: LoadedBank, attempts: Attempt[], marks: MarkEvent[]): MistakeQueue {
  const map = new Map<string, MistakeEntry>();
  for (const a of attempts.slice().sort((x, y) => x.submittedAt - y.submittedAt)) {
    for (const it of a.items) {
      const id = canonicalId(lb, it.questionId);
      const wrong = !it.correct && it.selected != null;
      let e = map.get(id);
      if (!e && !wrong) continue;
      if (!e) {
        e = { questionId: id, state: "active", timesWrong: 0, timesSeen: 0, streak: 0, lastWrongAt: 0, category: lb.byId.get(id)?.audit.syllabusCategory ?? it.category };
        map.set(id, e);
      }
      if (it.selected == null) continue; // blank answers neither add nor clear
      e.timesSeen += 1;
      if (wrong) {
        e.timesWrong += 1;
        e.streak = 0;
        e.lastWrongAt = a.submittedAt;
      } else {
        e.streak += 1;
      }
    }
  }
  const latest = latestMarks(marks.map((m) => ({ ...m, questionId: canonicalId(lb, m.questionId) })));
  const all: MistakeEntry[] = [];
  for (const e of map.values()) {
    const q = lb.byId.get(e.questionId);
    if (!q || q.audit.contentStatus !== "approved") continue; // never serve quarantined items
    if (e.streak >= MISTAKES_CLEAR_STREAK) e.state = "cleared";
    else if (latest.get(e.questionId) === "mastered") e.state = "markedMastered";
    else e.state = e.streak === 1 ? "oneCorrect" : "active";
    all.push(e);
  }
  all.sort((a, b) => b.timesWrong - a.timesWrong || b.lastWrongAt - a.lastWrongAt);
  const toFix = all.filter((e) => e.state === "active" || e.state === "oneCorrect");
  return {
    toFix,
    oneCorrect: all.filter((e) => e.state === "oneCorrect"),
    mastered: all.filter((e) => e.state === "cleared" || e.state === "markedMastered"),
    all,
  };
}

export interface MistakesExamPlan {
  questionIds: string[];
  durationMs: number;
  passMark: number;
}

/** All current mistakes in ONE exam: 90 seconds per question, pass mark 65% rounded up. */
export function buildMistakesExam(lb: LoadedBank, attempts: Attempt[], marks: MarkEvent[], seed: number): MistakesExamPlan {
  const ids = mistakeQueue(lb, attempts, marks).toFix.map((e) => e.questionId);
  const questionIds = shuffle(ids, createRng(seed));
  return {
    questionIds,
    durationMs: questionIds.length * MISTAKES_SECONDS_PER_QUESTION * 1000,
    passMark: questionIds.length ? passMarkFor(questionIds.length) : 0,
  };
}
