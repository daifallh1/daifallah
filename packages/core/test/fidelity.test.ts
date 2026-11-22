import { describe, expect, it } from "vitest";
import { lb, readJson } from "./helpers";

/**
 * Golden source-fidelity tests (acceptance test 2): every English stem, option and key in the bank
 * must be found in the verifiable text region of the PDF page(s) it was extracted from.
 * pages.json is the per-line pdfplumber snapshot of the PDF (same SHA-256 as the bank).
 */
const pages = readJson("source/pages.json");
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
  for (const q of lb.bank.questions) {
    it(`${q.questionId} (p${q.sourcePage} #${q.printedQuestionNumber}) matches its source region`, () => {
      const region = regionText(q);
      expect(region).toContain(flat(q.englishQuestion));
      for (const o of q.englishOptions) {
        const re = new RegExp(`${o.label}\\s*[.)]\\s?${flat(o.text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        expect(region).toMatch(re);
      }
      const keys = [...region.matchAll(/(?<!Add\s)(?:Correct\s+)?Answer\s*:\s*([A-D])\b/gi)].map((m) => m[1]!.toUpperCase());
      expect(keys).toEqual([q.sourceAnswerKey]);
      if (q.sourceExplanation) expect(region).toContain(flat(q.sourceExplanation));
    });
  }
});
