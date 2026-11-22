import { describe, expect, it } from "vitest";
import { generateExam } from "../src";
import { lb } from "./helpers";

describe("blueprint exam generation (acceptance tests 3 & 4)", () => {
  const seeds = Array.from({ length: 300 }, (_, i) => i * 7919 + 1);
  it("produces 40 questions with category counts [12,4,4,16,2,1,1] and a 16/24 Bloom split", () => {
    for (const seed of seeds) {
      const e = generateExam(lb, { seed });
      expect(e.questionIds).toHaveLength(40);
      expect(e.blueprint.fullyCompliant).toBe(true);
      const qs = e.questionIds.map((id) => lb.byId.get(id)!);
      const counts = [1, 2, 3, 4, 5, 6, 7].map((c) => qs.filter((q) => q.audit.syllabusCategory === c).length);
      expect(counts).toEqual([12, 4, 4, 16, 2, 1, 1]);
      expect(qs.filter((q) => q.audit.bloomLevel === 1).length).toBe(16);
      expect(qs.filter((q) => q.audit.bloomLevel === 2).length).toBe(24);
    }
  });
  it("never repeats a question, duplicate group or near-duplicate group within one exam", () => {
    for (const seed of seeds) {
      const qs = generateExam(lb, { seed }).questionIds.map((id) => lb.byId.get(id)!);
      expect(new Set(qs.map((q) => q.questionId)).size).toBe(40);
      expect(new Set(qs.map((q) => q.audit.duplicateGroupId)).size).toBe(40);
      expect(new Set(qs.map((q) => q.audit.exclusionGroupId)).size).toBe(40);
    }
  });
  it("uses only approved, exam-eligible source questions", () => {
    for (const seed of seeds.slice(0, 50)) {
      for (const id of generateExam(lb, { seed }).questionIds) {
        const q = lb.byId.get(id)!;
        expect(q.audit.contentStatus).toBe("approved");
        expect(q.audit.examEligible).toBe(true);
      }
    }
  });
  it("is deterministic for a seed and varies across seeds", () => {
    expect(generateExam(lb, { seed: 42 }).questionIds).toEqual(generateExam(lb, { seed: 42 }).questionIds);
    expect(generateExam(lb, { seed: 42 }).questionIds).not.toEqual(generateExam(lb, { seed: 43 }).questionIds);
  });
  it("reports non-compliance honestly when the bank cannot satisfy the blueprint", () => {
    // remove every category-6 group: the AI quota (1) can no longer be met
    const cat6 = new Set(lb.examEligible.filter((q) => q.audit.syllabusCategory === 6).map((q) => q.audit.exclusionGroupId));
    const e = generateExam(lb, { seed: 1, excludeGroups: cat6 });
    expect(e.blueprint.fullyCompliant).toBe(false);
    expect(e.blueprint.problems.join(" ")).toMatch(/Category 6/);
    expect(e.questionIds.every((id) => lb.byId.get(id)!.audit.examEligible)).toBe(true);
  });
});
