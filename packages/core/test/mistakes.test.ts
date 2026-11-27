import { describe, expect, it } from "vitest";
import {
  answer, buildMistakesExam, canonicalId, createFixedExamSession, createKeyValueStorage, createMemoryBackend, createSession,
  fixedExamStatus, mistakeQueue, MISTAKES_SECONDS_PER_QUESTION, passMarkFor, submit, summarize, type Attempt, type OptionLabel,
} from "../src";
import { byOrdinal, lb } from "./helpers";

const wrongOf = (id: string): OptionLabel => (["A", "B", "C", "D"] as OptionLabel[]).find((l) => l !== lb.byId.get(id)!.sourceAnswerKey)!;
const keyOf = (id: string) => lb.byId.get(id)!.sourceAnswerKey;

function attempt(ids: string[], pick: (id: string) => OptionLabel | null, t: number, mode: "exam" | "mistakes" | "fixed" = "exam"): Attempt {
  let s = createSession({ lb, questionIds: ids, mode, now: t, blueprintCompliant: false, seed: 1, timed: false });
  for (const id of ids) {
    const l = pick(id);
    if (l) s = answer(s, id, l);
  }
  return submit(lb, s, t + 1000, "user");
}

const ids = lb.approved.slice(0, 6).map((q) => q.questionId);

describe("mistakes list (owner rules 2026-11-27)", () => {
  it("contains only questions answered WRONG; blanks and correct answers are not mistakes", () => {
    const a = attempt(ids, (id) => (id === ids[0] ? wrongOf(id) : id === ids[1] ? null : keyOf(id)), 1);
    const q = mistakeQueue(lb, [a], []);
    expect(q.toFix.map((e) => e.questionId)).toEqual([ids[0]]);
  });
  it("a question leaves the list after two correct answers in a row, and comes back on a new miss", () => {
    const x = ids[0]!;
    const a1 = attempt([x], wrongOf, 1);
    const a2 = attempt([x], keyOf, 2);
    expect(mistakeQueue(lb, [a1, a2], []).oneCorrect.map((e) => e.questionId)).toEqual([x]);
    expect(mistakeQueue(lb, [a1, a2], []).toFix).toHaveLength(1);
    const a3 = attempt([x], keyOf, 3);
    const q3 = mistakeQueue(lb, [a1, a2, a3], []);
    expect(q3.toFix).toHaveLength(0);
    expect(q3.mastered.map((e) => e.state)).toEqual(["cleared"]);
    const a4 = attempt([x], wrongOf, 4);
    const q4 = mistakeQueue(lb, [a1, a2, a3, a4], []);
    expect(q4.toFix.map((e) => [e.questionId, e.streak, e.timesWrong])).toEqual([[x, 0, 2]]);
  });
  it("correct, wrong, correct is NOT two in a row", () => {
    const x = ids[0]!;
    const q = mistakeQueue(lb, [attempt([x], wrongOf, 1), attempt([x], keyOf, 2), attempt([x], wrongOf, 3), attempt([x], keyOf, 4)], []);
    expect(q.toFix.map((e) => e.streak)).toEqual([1]);
  });
  it("questions marked 'mastered' are excluded", () => {
    const a = attempt(ids.slice(0, 2), wrongOf, 1);
    const q = mistakeQueue(lb, [a], [{ questionId: ids[0]!, mark: "mastered", at: 5 }]);
    expect(q.toFix.map((e) => e.questionId)).toEqual([ids[1]]);
    expect(q.mastered.map((e) => e.state)).toEqual(["markedMastered"]);
  });
  it("history on a hidden identical duplicate counts for its kept copy", () => {
    const dup = lb.bank.questions.find((q) => q.audit.contentStatus === "duplicate")!;
    const kept = canonicalId(lb, dup.questionId);
    expect(kept).not.toBe(dup.questionId);
    const fake: Attempt = { ...attempt([kept], wrongOf, 1) };
    fake.items = fake.items.map((i) => ({ ...i, questionId: dup.questionId }));
    expect(mistakeQueue(lb, [fake], []).toFix.map((e) => e.questionId)).toEqual([kept]);
  });
  it("the mistakes exam holds ALL current mistakes (no filling), 90 s per question, pass 65% rounded up", () => {
    const a = attempt(ids, wrongOf, 1);
    const plan = buildMistakesExam(lb, [a], [], 42);
    expect(plan.questionIds.slice().sort()).toEqual(ids.slice().sort());
    expect(plan.durationMs).toBe(6 * MISTAKES_SECONDS_PER_QUESTION * 1000);
    expect(plan.passMark).toBe(4); // ceil(0.65 * 6) = 3.9 -> 4
    const s = createSession({ lb, questionIds: plan.questionIds, mode: "mistakes", now: 0, blueprintCompliant: false, seed: 1, durationMs: plan.durationMs, passMark: plan.passMark });
    expect(s.durationMs).toBe(540_000);
    let s2 = s;
    for (const id of plan.questionIds.slice(0, 4)) s2 = answer(s2, id, keyOf(id));
    expect(submit(lb, s2, 1000, "user").passed).toBe(true);
    let s3 = s;
    for (const id of plan.questionIds.slice(0, 3)) s3 = answer(s3, id, keyOf(id));
    expect(submit(lb, s3, 1000, "user").passed).toBe(false);
  });
  it("never serves non-approved questions", () => {
    const a = attempt(ids, wrongOf, 1);
    const plan = buildMistakesExam(lb, [a], [], 1);
    for (const id of plan.questionIds) expect(lb.byId.get(id)!.audit.contentStatus).toBe("approved");
    expect(byOrdinal(212).audit.contentStatus).not.toBe("approved");
  });
});

describe("fixed exams", () => {
  it("passMarkFor rounds 65% up (42 -> 28, 43 -> 28, 40 -> 26)", () => {
    expect([passMarkFor(42), passMarkFor(43), passMarkFor(40)]).toEqual([28, 28, 26]);
  });
  it("a fixed exam session has the exam's questions, 60 minutes and its pass mark; status reflects attempts", () => {
    const e = lb.bank.fixedExams![2]!;
    const s = createFixedExamSession(lb, e.examId, 0, 7);
    expect(s.questionIds.slice().sort()).toEqual(e.questionIds.slice().sort());
    expect(s.durationMs).toBe(60 * 60 * 1000);
    expect(s.passMark).toBe(e.passMark);
    let s2 = s;
    for (const id of s.questionIds.slice(0, e.passMark)) s2 = answer(s2, id, keyOf(id));
    const a = submit(lb, s2, 1000, "user");
    expect(a.mode).toBe("fixed");
    expect(a.examId).toBe(e.examId);
    expect(a.passed).toBe(true);
    const st = fixedExamStatus(lb, [a], null);
    expect(st[2]!.latest?.attemptId).toBe(a.attemptId);
    expect(st[0]!.latest).toBeNull();
    expect(summarize([a], 2000).examAttempts).toBe(1);
  });
});

describe("backup and bookmarks", () => {
  it("exports everything and restores it on a fresh device", async () => {
    const st = createKeyValueStorage(createMemoryBackend());
    await st.saveAttempt(attempt(ids, wrongOf, 1));
    await st.addMark({ questionId: ids[0]!, mark: "confusing", at: 3 });
    await st.setBookmark(ids[1]!, true);
    await st.setBookmark(ids[2]!, true);
    await st.setBookmark(ids[2]!, false);
    expect(await st.listBookmarks()).toEqual([ids[1]]);
    const backup = JSON.parse(JSON.stringify(await st.exportBackup(10)));
    const fresh = createKeyValueStorage(createMemoryBackend());
    expect(await fresh.importBackup(JSON.stringify(backup))).toEqual({ attempts: 1, marks: 1, bookmarks: 1 });
    expect((await fresh.listAttempts())[0]!.score).toBe(0);
    expect(await fresh.listBookmarks()).toEqual([ids[1]]);
  });
  it("rejects files that are not a backup without touching stored data", async () => {
    const st = createKeyValueStorage(createMemoryBackend());
    await st.setBookmark("x", true);
    await expect(st.importBackup({ hello: 1 })).rejects.toThrow(/not an ITIL 5 progress backup/);
    expect(await st.listBookmarks()).toEqual(["x"]);
  });
});
