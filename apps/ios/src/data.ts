import { createTranslator, loadBank, loadTranslations, type Attempt } from "@itil5/core";
// Bundled at build time: the whole bank and Arabic overlay ship inside the app binary (offline).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bankJson = require("@itil5/content/build/bank.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const trJson = require("@itil5/content/build/translations.ar.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const auditJson = require("@itil5/content/reports/import-audit.json");

export const lb = loadBank(bankJson);
export const translations = loadTranslations(trJson, lb.bank);
export const t = createTranslator(translations);

const SHORT: Record<number, string> = {
  1: "Key ITIL terms", 2: "Four dimensions", 3: "Product & service lifecycle", 4: "The ITIL Value System",
  5: "Value streams", 6: "ITIL and AI", 7: "Other frameworks",
};
/** Full syllabus category name, e.g. "4 · The ITIL Value System". */
export const categoryLabel = (id: number | null) =>
  id == null ? "Unclassified" : `${id} · ${lb.bank.categories.find((c) => c.id === id)?.name ?? ""}`;
export const categoryShort = (id: number | null) => (id == null ? "Unclassified" : `${id} · ${SHORT[id] ?? `Category ${id}`}`);

export const fixedTitle = (examId?: string) => lb.bank.fixedExams?.find((e) => e.examId === examId)?.title ?? "Fixed exam";
/** Human name for an attempt: "Exam 3", "Random exam", "Mistakes exam". */
export function attemptTitle(a: Pick<Attempt, "mode" | "examId">): string {
  if (a.mode === "fixed") return fixedTitle(a.examId);
  if (a.mode === "mistakes") return "Mistakes exam";
  return "Random exam";
}
export const pct = (score: number, total: number) => (total ? Math.round((1000 * score) / total) / 10 : 0);
