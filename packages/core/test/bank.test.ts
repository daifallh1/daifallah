import { describe, expect, it } from "vitest";
import { byOrdinal, lb, readJson } from "./helpers";

const audit = readJson("reports/import-audit.json");

describe("PDF audit counts (acceptance test 1)", () => {
  it("accounts for every answer-key line in the PDF as exactly one occurrence", () => {
    expect(audit.confirmedCounts.answerKeyLines).toBe(302);
    expect(lb.bank.questions).toHaveLength(302);
    expect(audit.confirmedCounts.pdfPages).toBe(76);
  });
  it("gives each occurrence exactly four options A-D and an explicit source key", () => {
    for (const q of lb.bank.questions) {
      expect(q.englishOptions.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
      expect(["A", "B", "C", "D"]).toContain(q.sourceAnswerKey);
      expect(q.englishQuestion.length).toBeGreaterThan(5);
    }
  });
  it("records 282 source explanations and 20 occurrences without one", () => {
    expect(lb.bank.questions.filter((q) => q.sourceExplanation).length).toBe(282);
    expect(lb.bank.questions.filter((q) => !q.sourceExplanation).length).toBe(20);
  });
  it("uses stable unique IDs derived from the file digest + ordinal, never the printed number", () => {
    const ids = new Set(lb.bank.questions.map((q) => q.questionId));
    expect(ids.size).toBe(302);
    for (const q of lb.bank.questions) {
      expect(q.questionId).toBe(`itilf5-${q.sourceDocumentSha256.slice(0, 12)}-o${String(q.sourceOrdinal).padStart(3, "0")}`);
    }
  });
});

describe("Source anomaly regression (acceptance test 11)", () => {
  it("keeps reused printed labels 103 and 178 as separate occurrences", () => {
    expect(audit.printedNumberAnomalies.reusedLabels).toEqual({ "103": [103, 104], "178": [178, 179] });
    const q103 = lb.bank.questions.filter((q) => q.printedQuestionNumber === 103);
    expect(q103.map((q) => q.sourcePage)).toEqual([25, 25]);
    expect(q103[0]!.englishQuestion).not.toBe(q103[1]!.englishQuestion);
    const q178 = lb.bank.questions.filter((q) => q.printedQuestionNumber === 178);
    expect(q178.map((q) => q.sourcePage)).toEqual([41, 41]);
  });
  it("reports printed numbers 171 and 300 as missing", () => {
    expect(audit.printedNumberAnomalies.missingNumbers).toEqual([171, 300]);
  });
  it("quarantines Q195 (editorial 'Add answer' line) without inserting it into the question", () => {
    const q = lb.bank.questions.find((x) => x.printedQuestionNumber === 195)!;
    expect(q.sourcePage).toBe(46);
    expect(q.editorialArtifacts).toEqual(["Add answer: D. The external partner providing technology."]);
    expect(q.englishQuestion).not.toContain("Add answer");
    expect(q.englishOptions.every((o) => !o.text.includes("Add answer"))).toBe(true);
    expect(q.audit.contentStatus).toBe("needs_review");
    expect(q.audit.examEligible).toBe(false);
  });
  it("marks ITIL 4 value-chain content (Q139) out of scope instead of rewriting it", () => {
    const q = lb.bank.questions.find((x) => x.printedQuestionNumber === 139)!;
    expect(q.englishOptions.map((o) => o.text)).toEqual(["Engage", "Obtain/build", "Plan", "Improve"]);
    expect(q.audit.contentStatus).toBe("out_of_scope");
  });
  it("flags the conflicting duplicate keys (p.26 key A vs p.39 key C) and serves neither", () => {
    const a = byOrdinal(106), c = byOrdinal(165);
    // stems differ only in punctuation placement (preserved verbatim); options are identical
    const norm = (x: string) => x.replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
    expect(norm(a.englishQuestion)).toBe(norm(c.englishQuestion));
    expect(a.englishQuestion).not.toBe(c.englishQuestion);
    expect(a.englishOptions).toEqual(c.englishOptions);
    expect(a.audit.duplicateGroupId).toBe(c.audit.duplicateGroupId);
    expect([a.sourceAnswerKey, c.sourceAnswerKey]).toEqual(["A", "C"]);
    for (const q of [a, c]) {
      expect(q.audit.reviewReasons.map((r) => r.code)).toContain("duplicate_key_conflict");
      expect(q.audit.examEligible).toBe(false);
    }
  });
  it("quarantines Q190 whose options B and C are both 'Warranty'", () => {
    const q = byOrdinal(191);
    expect(q.englishOptions[1]!.text).toBe("Warranty");
    expect(q.englishOptions[2]!.text).toBe("Warranty");
    expect(q.audit.contentStatus).toBe("needs_review");
  });
  it("never serves a non-approved item as exam-eligible", () => {
    for (const q of lb.bank.questions) if (q.audit.examEligible) expect(q.audit.contentStatus).toBe("approved");
  });
});

describe("identical duplicates removed (owner request 2026-11-25)", () => {
  const sig = (q: (typeof lb.bank.questions)[number]) => {
    const n = (x: string) => x.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    return [n(q.englishQuestion), ...q.englishOptions.map((o) => n(o.text)), q.sourceAnswerKey].join("|");
  };
  it("keeps all 302 source occurrences in the data for traceability", () => {
    expect(lb.bank.questions).toHaveLength(302);
  });
  it("no two practiceable (approved) questions are identical", () => {
    const sigs = lb.approved.map(sig);
    expect(new Set(sigs).size).toBe(sigs.length);
  });
  it("every removed duplicate points to a kept copy with identical content and is never served", () => {
    const dups = lb.bank.questions.filter((q) => q.audit.contentStatus === "duplicate");
    expect(dups).toHaveLength(48);
    for (const d of dups) {
      const kept = lb.byId.get(d.audit.duplicateOf!)!;
      expect(kept).toBeDefined();
      expect(kept.audit.contentStatus).not.toBe("duplicate");
      expect(sig(kept)).toBe(sig(d));
      expect(d.audit.examEligible).toBe(false);
    }
    for (const q of lb.bank.questions) if (q.audit.contentStatus !== "duplicate") expect(q.audit.duplicateOf).toBeNull();
  });
  it("only identical copies were removed: reordered or different-option variants and the key conflict remain", () => {
    expect(byOrdinal(106).audit.contentStatus).toBe("needs_review");
    expect(byOrdinal(165).audit.contentStatus).toBe("needs_review");
    const groups = new Map<string, number>();
    for (const q of lb.approved) groups.set(q.audit.duplicateGroupId, (groups.get(q.audit.duplicateGroupId) ?? 0) + 1);
    expect([...groups.values()].some((n) => n > 1)).toBe(true); // non-identical variants of the same stem still exist
  });
});
