import { describe, expect, it } from "vitest";
import { answer, buildMistakesPractice, createSession, generateExam, submit, summarize, wrongItems, type Attempt } from "../src";
import { lb } from "./helpers";

const t0 = Date.UTC(2026, 10, 1);
function attempt(seed: number, correctUpTo: number, when: number): Attempt {
  const e = generateExam(lb, { seed });
  let s = createSession({ lb, questionIds: e.questionIds, mode: "exam", now: when, blueprintCompliant: true, seed });
  s.questionIds.forEach((id, i) => {
    const k = lb.byId.get(id)!.sourceAnswerKey;
    s = answer(s, id, i < correctUpTo ? k : k === "D" ? "A" : "D");
  });
  return submit(lb, s, when + 20 * 60_000, "user");
}

describe("review logic (acceptance test 7)", () => {
  it("wrong-answer review contains only items actually missed", () => {
    const a = attempt(11, 30, t0);
    const w = wrongItems(a);
    expect(w).toHaveLength(10);
    for (const i of w) {
      expect(i.correct).toBe(false);
      expect(i.selected).not.toBe(i.sourceAnswerKey);
    }
  });
  it("mistakes-only practice never contains a question that was not previously missed", () => {
    const history = [attempt(1, 20, t0), attempt(2, 28, t0 + 86_400_000), attempt(3, 35, t0 + 2 * 86_400_000)];
    const missed = new Set(history.flatMap((a) => wrongItems(a).map((i) => i.questionId)));
    for (const seed of [1, 2, 3, 4, 5]) {
      const ids = buildMistakesPractice(lb, history, [], { now: t0 + 3 * 86_400_000, size: 20, seed });
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(missed.has(id)).toBe(true);
        expect(lb.byId.has(id)).toBe(true);
      }
      expect(new Set(ids.map((id) => lb.byId.get(id)!.audit.exclusionGroupId)).size).toBe(ids.length);
    }
  });
  it("excludes items marked mastered unless asked, and returns nothing with no history", () => {
    const h = [attempt(9, 39, t0)];
    const only = wrongItems(h[0]!)[0]!.questionId;
    expect(buildMistakesPractice(lb, h, [{ questionId: only, mark: "mastered", at: t0 + 1 }], { now: t0 + 2, size: 10, seed: 1 })).toEqual([]);
    expect(buildMistakesPractice(lb, h, [{ questionId: only, mark: "mastered", at: t0 + 1 }], { now: t0 + 2, size: 10, seed: 1, includeMastered: true })).toEqual([only]);
    expect(buildMistakesPractice(lb, [], [], { now: t0, size: 10, seed: 1 })).toEqual([]);
  });
});

describe("analytics", () => {
  it("returns nulls, not fake numbers, when there is no history", () => {
    const s = summarize([], t0);
    expect(s.examAttempts).toBe(0);
    expect(s.passRate).toBeNull();
    expect(s.latest).toBeNull();
    expect(s.last7.averagePercent).toBeNull();
    expect(s.byCategory).toEqual([]);
  });
  it("summarizes observed attempts", () => {
    const h = [attempt(1, 20, t0), attempt(2, 30, t0 + 86_400_000)];
    const s = summarize(h, t0 + 2 * 86_400_000);
    expect(s.examAttempts).toBe(2);
    expect(s.passRate).toBe(0.5);
    expect(s.latest!.score).toBe(30);
    expect(s.last7.attempts).toBe(2);
    expect(s.byCategory.reduce((n, c) => n + c.total, 0)).toBe(80);
  });
});
