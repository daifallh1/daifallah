import { describe, expect, it } from "vitest";
import {
  answer, createKeyValueStorage, createMemoryBackend, createSession, EXTENDED_DURATION_MS, generateExam,
  goTo, isExpired, progress, remainingMs, STANDARD_DURATION_MS, submit, toggleFlag, type OptionLabel,
} from "../src";
import { lb } from "./helpers";

const t0 = Date.UTC(2026, 10, 22, 10, 0, 0);
function exam(seed = 5) {
  const e = generateExam(lb, { seed });
  return createSession({ lb, questionIds: e.questionIds, mode: "exam", now: t0, blueprintCompliant: e.blueprint.fullyCompliant, seed });
}
const wrong = (k: OptionLabel): OptionLabel => (k === "A" ? "B" : "A");

describe("exam mechanics (acceptance test 5)", () => {
  it("defaults to a 60-minute countdown; 75 minutes only when explicitly selected", () => {
    expect(exam().durationMs).toBe(STANDARD_DURATION_MS);
    const e = generateExam(lb, { seed: 1 });
    const ext = createSession({ lb, questionIds: e.questionIds, mode: "exam", now: t0, extendedTime: true, blueprintCompliant: true, seed: 1 });
    expect(ext.durationMs).toBe(EXTENDED_DURATION_MS);
    expect(ext.extendedTime).toBe(true);
  });
  it("counts down from the start timestamp and expires at 60:00", () => {
    const s = exam();
    expect(remainingMs(s, t0 + 10 * 60_000)).toBe(50 * 60_000);
    expect(isExpired(s, t0 + 59 * 60_000)).toBe(false);
    expect(isExpired(s, t0 + 60 * 60_000)).toBe(true);
  });
  it("supports navigation, flagging, editing answers and unanswered tracking", () => {
    let s = exam();
    const [a, b] = s.questionIds as [string, string];
    s = answer(s, a, "A");
    s = answer(s, a, "C"); // edit
    s = toggleFlag(s, b);
    s = goTo(s, 99);
    expect(s.current).toBe(39);
    expect(s.answers[a]).toBe("C");
    expect(progress(s)).toEqual({ answered: 1, unanswered: 39, flagged: 1, total: 40 });
  });
  it("awards one mark per correct answer with no negative marking; 26/40 passes, 25/40 fails", () => {
    for (const nCorrect of [0, 25, 26, 40]) {
      let s = exam();
      s.questionIds.forEach((id, i) => {
        const key = lb.byId.get(id)!.sourceAnswerKey;
        if (i < nCorrect) s = answer(s, id, key);
        else if (i % 2 === 0) s = answer(s, id, wrong(key)); // wrong answers cost nothing extra
      });
      const a = submit(lb, s, t0 + 30 * 60_000, "user");
      expect(a.score).toBe(nCorrect);
      expect(a.total).toBe(40);
      expect(a.passed).toBe(nCorrect >= 26);
    }
  });
  it("auto-submission by timer caps elapsed time at the duration", () => {
    const a = submit(lb, exam(), t0 + 2 * 60 * 60_000, "timer");
    expect(a.submittedBy).toBe("timer");
    expect(a.elapsedMs).toBe(STANDARD_DURATION_MS);
  });
  it("persists and resumes an in-progress session and stores attempts with snapshots", async () => {
    const store = createKeyValueStorage(createMemoryBackend());
    let s = exam();
    s = answer(s, s.questionIds[0]!, "B");
    await store.setActiveSession(s);
    const restored = (await store.getActiveSession())!;
    expect(restored.answers[s.questionIds[0]!]).toBe("B");
    expect(remainingMs(restored, t0 + 5 * 60_000)).toBe(55 * 60_000);
    const att = submit(lb, restored, t0 + 6 * 60_000, "user");
    await store.saveAttempt(att);
    await store.setActiveSession(null);
    expect(await store.getActiveSession()).toBeNull();
    const [saved] = await store.listAttempts();
    expect(saved!.items[0]!.snapshot.englishQuestion).toBe(lb.byId.get(s.questionIds[0]!)!.englishQuestion);
    expect(saved!.bankVersion).toBe(lb.bank.bankVersion);
  });
  it("refuses to put quarantined questions into a session", () => {
    const bad = lb.bank.questions.find((q) => q.audit.contentStatus !== "approved")!;
    expect(() => createSession({ lb, questionIds: [bad.questionId], mode: "exam", now: t0, blueprintCompliant: false, seed: 0 })).toThrow();
  });
});
