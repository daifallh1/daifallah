import { describe, expect, it } from "vitest";
import { byDump, byOrdinal, dumpQuestions, lb, original, pdfQuestions, readJson } from "./helpers";

const audit = readJson("reports/import-audit.json");

describe("PDF audit counts (acceptance test 1)", () => {
  it("accounts for every answer-key line in the PDF as exactly one occurrence", () => {
    expect(audit.confirmedCounts.answerKeyLines).toBe(302);
    expect(pdfQuestions).toHaveLength(302);
    expect(lb.bank.questions).toHaveLength(302 + 34);
    expect(audit.confirmedCounts.pdfPages).toBe(76);
  });
  it("gives each occurrence exactly four options A-D and an explicit source key", () => {
    for (const q of lb.bank.questions) {
      expect(q.englishOptions.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
      expect(["A", "B", "C", "D"]).toContain(q.sourceAnswerKey);
      expect(q.englishQuestion.length).toBeGreaterThan(5);
    }
  });
  it("records 282 source explanations and 20 occurrences without one (as printed)", () => {
    expect(pdfQuestions.filter((q) => original(q).sourceExplanation).length).toBe(282);
    expect(pdfQuestions.filter((q) => !original(q).sourceExplanation).length).toBe(20);
  });
  it("every approved question has an explanation: the source's, or an AI-written one citing the book", () => {
    for (const q of lb.approved) {
      expect(Boolean(q.sourceExplanation) !== Boolean(q.supplementaryExplanation)).toBe(true);
      if (q.supplementaryExplanation) {
        expect(q.supplementaryExplanation.author).toBe("ai");
        expect(q.supplementaryExplanation.bookReference).toMatch(/\d/);
      }
    }
    expect(lb.approved.filter((q) => q.supplementaryExplanation)).toHaveLength(45);
  });
  it("uses stable unique IDs derived from the file digest + ordinal, never the printed number", () => {
    const ids = new Set(lb.bank.questions.map((q) => q.questionId));
    expect(ids.size).toBe(336);
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
  it("Q195: the editorial 'Add answer' line was never inserted, and was removed by owner correction (key C kept)", () => {
    const q = byOrdinal(196);
    expect(q.printedQuestionNumber).toBe(195);
    expect(q.sourcePage).toBe(46);
    expect(original(q).editorialArtifacts).toEqual(["Add answer: D. The external partner providing technology."]);
    expect(q.editorialArtifacts).toEqual([]);
    expect(q.englishQuestion).not.toContain("Add answer");
    expect(q.englishOptions.every((o) => !o.text.includes("Add answer"))).toBe(true);
    expect(q.sourceAnswerKey).toBe("C");
    expect(q.correction?.bookReference).toBe("3.2.1.1");
    expect(q.audit.contentStatus).toBe("approved");
  });
  it("marks ITIL 4 value-chain content (Q139) out of scope instead of rewriting it", () => {
    const q = lb.bank.questions.find((x) => x.printedQuestionNumber === 139)!;
    expect(q.englishOptions.map((o) => o.text)).toEqual(["Engage", "Obtain/build", "Plan", "Improve"]);
    expect(q.audit.contentStatus).toBe("out_of_scope");
  });
  it("resolves the key conflict (p.26 key A vs p.39 key C) to A per the book (5.2.2); the p.39 copy becomes a duplicate", () => {
    const a = byOrdinal(106), c = byOrdinal(165);
    const norm = (x: string) => x.replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
    expect(norm(a.englishQuestion)).toBe(norm(c.englishQuestion));
    expect(a.englishOptions).toEqual(c.englishOptions);
    expect([original(a).sourceAnswerKey, original(c).sourceAnswerKey]).toEqual(["A", "C"]);
    expect([a.sourceAnswerKey, c.sourceAnswerKey]).toEqual(["A", "A"]);
    expect(c.correction?.bookReference).toBe("5.2.2");
    expect(a.audit.contentStatus).toBe("approved");
    expect(c.audit.contentStatus).toBe("duplicate");
    expect(c.audit.duplicateOf).toBe(a.questionId);
  });
  it("Q190: duplicate 'Warranty' option C corrected to 'User experience' (book 3.2.4)", () => {
    const q = byOrdinal(191);
    expect(original(q).englishOptions.map((o) => o.text).slice(1, 3)).toEqual(["Warranty", "Warranty"]);
    expect(q.englishOptions[2]!.text).toBe("User experience");
    expect(q.correction?.bookReference).toBe("3.2.4");
  });
  it("Q211 stays quarantined (the book calls a 'series of steps' a value stream)", () => {
    expect(byOrdinal(212).audit.contentStatus).toBe("needs_review");
    expect(byOrdinal(212).audit.examEligible).toBe(false);
  });
  it("book-review key corrections: #93/#153 -> Value streams and processes, #298 -> C, dump #25 -> Support", () => {
    for (const o of [93, 154]) expect(byOrdinal(o).englishOptions.find((x) => x.label === byOrdinal(o).sourceAnswerKey)!.text).toBe("Value streams and processes");
    expect(byOrdinal(299).sourceAnswerKey).toBe("C");
    expect(byDump(25).englishOptions.find((x) => x.label === byDump(25).sourceAnswerKey)!.text).toBe("Support");
    expect(byDump(12).englishQuestion).toContain("dimension of product and service management");
  });
  it("ITIL 4 legacy items are study-only: labelled legacy and never exam-eligible", () => {
    const legacy = lb.bank.questions.filter((q) => q.audit.legacy);
    expect(legacy.length).toBe(13);
    for (const q of legacy) {
      expect(q.audit.contentStatus).toBe("out_of_scope");
      expect(q.audit.examEligible).toBe(false);
    }
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
    expect(pdfQuestions).toHaveLength(302);
  });
  it("no two practiceable (approved) questions are identical", () => {
    const sigs = lb.approved.map(sig);
    expect(new Set(sigs).size).toBe(sigs.length);
  });
  it("every removed duplicate points to a kept copy with identical content and is never served", () => {
    const dups = lb.bank.questions.filter((q) => q.audit.contentStatus === "duplicate");
    // 48 identical in the source + 3 that became identical after correction (#143, #164, #190)
    expect(dups).toHaveLength(51);
    for (const d of dups) {
      const kept = lb.byId.get(d.audit.duplicateOf!)!;
      expect(kept).toBeDefined();
      expect(kept.audit.contentStatus).not.toBe("duplicate");
      expect(sig(kept)).toBe(sig(d));
      expect(d.audit.examEligible).toBe(false);
    }
    for (const q of lb.bank.questions) if (q.audit.contentStatus !== "duplicate") expect(q.audit.duplicateOf ?? null).toBeNull();
  });
  it("only identical copies were removed: reordered or different-option variants remain", () => {
    const groups = new Map<string, number>();
    for (const q of lb.approved) groups.set(q.audit.duplicateGroupId, (groups.get(q.audit.duplicateGroupId) ?? 0) + 1);
    expect([...groups.values()].some((n) => n > 1)).toBe(true); // non-identical variants of the same stem still exist
  });
});

describe("six fixed exams (owner request 2026-11-27)", () => {
  const exams = lb.bank.fixedExams ?? [];
  it("has six exams of 42-43 questions, 60 minutes, pass mark 65% rounded up", () => {
    expect(exams).toHaveLength(6);
    for (const e of exams) {
      expect([42, 43]).toContain(e.questionIds.length);
      expect(e.durationMinutes).toBe(60);
      expect(e.passMark).toBe(Math.ceil(0.65 * e.questionIds.length));
    }
  });
  it("covers every distinct exam-eligible question exactly once, with no overlap", () => {
    const all = exams.flatMap((e) => e.questionIds);
    expect(new Set(all).size).toBe(all.length);
    const groups = new Set(lb.examEligible.map((q) => q.audit.exclusionGroupId));
    expect(all.length).toBe(groups.size);
    const used = new Set(all.map((id) => lb.byId.get(id)!.audit.exclusionGroupId));
    expect(used.size).toBe(groups.size);
    for (const id of all) expect(lb.byId.get(id)!.audit.examEligible).toBe(true);
  });
  it("balances categories across exams (difference of at most one per category)", () => {
    for (const c of [1, 2, 3, 4, 5, 7]) {
      const n = exams.map((e) => e.questionIds.filter((id) => lb.byId.get(id)!.audit.syllabusCategory === c).length);
      expect(Math.max(...n) - Math.min(...n)).toBeLessThanOrEqual(1);
    }
    const ai = exams.map((e) => e.questionIds.filter((id) => lb.byId.get(id)!.audit.syllabusCategory === 6).length);
    expect(ai.reduce((a, b) => a + b, 0)).toBe(1);
  });
  it("imports 34 dump questions, all approved and exam-eligible", () => {
    expect(dumpQuestions).toHaveLength(34);
    for (const q of dumpQuestions) expect(q.audit.examEligible).toBe(true);
  });
});
