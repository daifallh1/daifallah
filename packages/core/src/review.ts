import type { LoadedBank } from "./bank";
import type { Attempt, AttemptItem, MarkEvent, StudyMark } from "./schema";
import { createRng, shuffle } from "./rng";

export interface WrongItem extends AttemptItem {
  attemptId: string;
  submittedAt: number;
}

/** Only items actually answered incorrectly (or left blank) in the attempt. */
export function wrongItems(a: Attempt): WrongItem[] {
  return a.items.filter((i) => !i.correct).map((i) => ({ ...i, attemptId: a.attemptId, submittedAt: a.submittedAt }));
}

export interface MistakeStats {
  questionId: string;
  timesWrong: number;
  timesSeen: number;
  timesRightSinceLastWrong: number;
  lastWrongAt: number;
  lastSeenAt: number;
  latestMark: StudyMark | null;
}

/** Aggregate history: every question the learner has ever missed, with recurrence data. */
export function mistakeStats(attempts: Attempt[], marks: MarkEvent[]): MistakeStats[] {
  const stats = new Map<string, MistakeStats>();
  const sorted = attempts.slice().sort((x, y) => x.submittedAt - y.submittedAt);
  for (const a of sorted) {
    for (const i of a.items) {
      let s = stats.get(i.questionId);
      if (!s && i.correct) continue; // only track questions once they have been missed
      if (!s) {
        s = { questionId: i.questionId, timesWrong: 0, timesSeen: 0, timesRightSinceLastWrong: 0, lastWrongAt: 0, lastSeenAt: 0, latestMark: null };
        stats.set(i.questionId, s);
      }
      s.timesSeen += 1;
      s.lastSeenAt = a.submittedAt;
      if (i.correct) s.timesRightSinceLastWrong += 1;
      else {
        s.timesWrong += 1;
        s.lastWrongAt = a.submittedAt;
        s.timesRightSinceLastWrong = 0;
      }
    }
  }
  const latest = latestMarks(marks);
  for (const s of stats.values()) s.latestMark = latest.get(s.questionId) ?? null;
  return [...stats.values()];
}

export function latestMarks(marks: MarkEvent[]): Map<string, StudyMark> {
  const m = new Map<string, StudyMark>();
  for (const e of marks.slice().sort((a, b) => a.at - b.at)) m.set(e.questionId, e.mark);
  return m;
}

/**
 * Priority for spaced review: more errors and more recent errors rank higher; correct answers
 * since the last miss and a "mastered" mark push an item down. Items seen in the very last
 * session are de-prioritised to avoid immediate repetition.
 */
export function mistakePriority(s: MistakeStats, now: number, lastSessionIds: Set<string>): number {
  const daysSinceWrong = Math.max(0, (now - s.lastWrongAt) / 86_400_000);
  let p = s.timesWrong * 3 + 6 / (1 + daysSinceWrong) - s.timesRightSinceLastWrong * 2;
  if (s.latestMark === "confusing") p += 3;
  if (s.latestMark === "mastered") p -= 8;
  if (lastSessionIds.has(s.questionId)) p -= 4;
  return p;
}

/**
 * Build a Mistakes-Only practice set. Returns ONLY question IDs the learner previously answered
 * incorrectly, that still exist in the current bank and are still approved. Never creates questions.
 */
export function buildMistakesPractice(
  lb: LoadedBank,
  attempts: Attempt[],
  marks: MarkEvent[],
  opts: { now: number; size: number; seed: number; includeMastered?: boolean },
): string[] {
  const stats = mistakeStats(attempts, marks).filter((s) => s.timesWrong > 0);
  const last = attempts.slice().sort((a, b) => b.submittedAt - a.submittedAt)[0];
  const lastIds = new Set(last?.items.map((i) => i.questionId) ?? []);
  const usable = stats.filter((s) => {
    const q = lb.byId.get(s.questionId);
    return q && q.audit.contentStatus === "approved" && (opts.includeMastered || s.latestMark !== "mastered");
  });
  const rng = createRng(opts.seed);
  // shuffle first so ties are broken randomly, then stable-sort by priority
  const ranked = shuffle(usable, rng).sort((a, b) => mistakePriority(b, opts.now, lastIds) - mistakePriority(a, opts.now, lastIds));
  // avoid two items from the same duplicate group in one practice set
  const seenGroups = new Set<string>();
  const out: string[] = [];
  for (const s of ranked) {
    const g = lb.byId.get(s.questionId)?.audit.exclusionGroupId;
    if (!g || seenGroups.has(g)) continue;
    seenGroups.add(g);
    out.push(s.questionId);
    if (out.length >= opts.size) break;
  }
  return shuffle(out, rng);
}
