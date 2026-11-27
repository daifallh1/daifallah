import { describe, expect, it } from "vitest";
import { dumpQuestions, lb, original, pdfQuestions, readJson } from "./helpers";

/**
 * Golden source-fidelity tests (acceptance test 2): every English stem, option and key in the bank
 * must be found in the verifiable text region of the PDF page(s) it was extracted from.
 * pages.json is the per-line pdfplumber snapshot of the PDF (same SHA-256 as the bank).
 * Owner-approved corrections are checked against their recorded original text, and the
 * correction must be the ONLY difference (see corrections.json).
 */
const pages = readJson("source/pages.json");
const dump = readJson("data/dump-occurrences.json");
const corrections = readJson("data/corrections.json").corrections as {
  source: string; ordinal: number; answerKey?: string; options?: Record<string, string>; replace?: [string, string][];
  removeEditorialArtifacts?: boolean; dropExplanation?: boolean;
}[];
type Line = { i: number; text: string };
const pageLines = (p: number): Line[] => pages.pages[p - 1].lines;

function regionText(q: (typeof lb.bank.questions)[number]): string {
  const parts: string[] = [];
  for (const r of q.sourceRegion) for (const l of pageLines(r.page)) if (l.i >= r.firstLine && l.i <= r.lastLine) parts.push(l.text.trim());
  // join wraps exactly like the extractor: keep a trailing hyphen and join without space
  let out = "";
  for (const t of parts) out = out === "" ? t : out.endsWith("-") && /^[A-Za-z0-9]/.test(t) ? out + t : out + " " + t;
  return out;
}
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

describe("source fidelity against PDF text regions", () => {
  it("bank is derived from the same PDF digest as the page snapshot", () => {
    expect(pages.sourceDocumentSha256).toBe(lb.bank.sourceDocumentSha256);
  });
  for (const q of pdfQuestions) {
    it(`${q.questionId} (p${q.sourcePage} #${q.printedQuestionNumber}) matches its source region`, () => {
      const o0 = original(q);
      const region = regionText(q);
      expect(region).toContain(flat(o0.englishQuestion));
      for (const o of o0.englishOptions) {
        const re = new RegExp(`${o.label}\\s*[.)]\\s?${flat(o.text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        expect(region).toMatch(re);
      }
      const keys = [...region.matchAll(/(?<!Add\s)(?:Correct\s+)?Answer\s*:\s*([A-D])\b/gi)].map((m) => m[1]!.toUpperCase());
      expect(keys).toEqual([o0.sourceAnswerKey]);
      if (o0.sourceExplanation) expect(region).toContain(flat(o0.sourceExplanation));
    });
  }
});

describe("source fidelity: second source (dump) questions", () => {
  it("imports exactly the 34 owner-approved new questions from the dump file", () => {
    expect(dumpQuestions).toHaveLength(34);
    for (const q of dumpQuestions) expect(q.sourceDocumentSha256).toBe(dump.sourceDocumentSha256);
  });
  for (const q of dumpQuestions) {
    it(`dump #${q.printedQuestionNumber} is verbatim from the extracted dump (green key)`, () => {
      const d = dump.questions.find((x: { dumpNumber: number }) => x.dumpNumber === q.sourceOrdinal);
      const o0 = original(q);
      expect(o0.englishQuestion).toBe(d.englishQuestion);
      expect(o0.englishOptions).toEqual(d.englishOptions);
      expect(o0.sourceAnswerKey).toBe(d.sourceAnswerKey);
      expect(q.sourceExplanation).toBeNull();
    });
  }
});

describe("owner corrections change only what corrections.json records", () => {
  for (const c of corrections) {
    it(`${c.source} #${c.ordinal}`, () => {
      const q = lb.bank.questions.find((x) => (x.sourceKind ?? "pdf") === c.source && x.sourceOrdinal === c.ordinal)!;
      expect(q.correction?.label).toBe("معدّل");
      expect(q.correction?.bookReference).toBeTruthy();
      const o0 = original(q);
      let stem = o0.englishQuestion;
      let opts = o0.englishOptions.map((o) => ({ ...o, text: c.options?.[o.label] ?? o.text }));
      let expl = o0.sourceExplanation;
      for (const [a, b] of c.replace ?? []) {
        stem = stem.split(a).join(b);
        opts = opts.map((o) => ({ ...o, text: o.text.split(a).join(b) }));
        expl = expl ? expl.split(a).join(b) : expl;
      }
      if (c.dropExplanation) expl = null;
      expect(q.englishQuestion).toBe(stem);
      expect(q.englishOptions).toEqual(opts);
      expect(q.sourceAnswerKey).toBe(c.answerKey ?? o0.sourceAnswerKey);
      expect(q.sourceExplanation).toBe(expl);
      expect(q.editorialArtifacts).toEqual(c.removeEditorialArtifacts ? [] : o0.editorialArtifacts);
    });
  }
  it("questions without a correction record have no correction", () => {
    const keyed = new Set(corrections.map((c) => `${c.source}:${c.ordinal}`));
    for (const q of lb.bank.questions) if (!keyed.has(`${q.sourceKind ?? "pdf"}:${q.sourceOrdinal}`)) expect(q.correction ?? null).toBeNull();
  });
});
