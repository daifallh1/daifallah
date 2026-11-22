import { describe, expect, it } from "vitest";
import { questionFullyTranslated, UI_EN } from "../src";
import { lb, readJson, tr } from "./helpers";

describe("translation completeness (acceptance test 6)", () => {
  it("has Arabic for the stem, all four options and the explanation of every approved question", () => {
    const missing = lb.approved.filter((q) => !questionFullyTranslated(q, tr)).map((q) => q.questionId);
    expect(missing).toEqual([]);
  });
  it("links every translation to the exact English text it translates", () => {
    for (const q of lb.bank.questions) {
      expect(tr.content[q.i18n.question]?.en).toBe(q.englishQuestion);
      for (const o of q.englishOptions) expect(tr.content[q.i18n.options[o.label]]?.en).toBe(o.text);
      if (q.sourceExplanation) expect(tr.content[q.i18n.explanation!]?.en).toBe(q.sourceExplanation);
    }
  });
  it("has an Arabic string for every UI label", () => {
    for (const k of Object.keys(UI_EN)) expect(tr.ui[k], k).toBeTruthy();
    for (const k of Object.keys(tr.ui)) expect(Object.keys(UI_EN)).toContain(k);
  });
  it("does not leak correctness hints into option translations", () => {
    const hint = /(صحيح|الصحيحة|خاطئ|خطأ\s*$|\bcorrect\b)/i;
    for (const q of lb.approved) {
      for (const o of q.englishOptions) {
        const ar = tr.content[q.i18n.options[o.label]]!.ar;
        if (hint.test(ar)) expect(o.text.toLowerCase()).toMatch(/correct|true|incorrect|error|wrong/);
      }
    }
  });
  it("coverage report agrees: 100% for approved questions", () => {
    const cov = readJson("reports/translation-coverage.json");
    for (const f of Object.values(cov.approvedPerField) as { percent: number }[]) expect(f.percent).toBe(100);
    expect(cov.brokenTranslationLinks).toEqual([]);
  });
});
