import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadBank, loadTranslations } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
export const contentDir = resolve(here, "../../content");
export const readJson = (p: string) => JSON.parse(readFileSync(resolve(contentDir, p), "utf8"));
export const lb = loadBank(readJson("build/bank.json"));
export const tr = loadTranslations(readJson("build/translations.ar.json"), lb.bank);
/** PDF occurrence by ordinal (dump questions have their own ordinals; use byDump). */
export const byOrdinal = (n: number) => {
  const q = lb.bank.questions.find((x) => x.sourceKind !== "dump" && x.sourceOrdinal === n);
  if (!q) throw new Error(`no ordinal ${n}`);
  return q;
};
export const byDump = (n: number) => {
  const q = lb.bank.questions.find((x) => x.sourceKind === "dump" && x.sourceOrdinal === n);
  if (!q) throw new Error(`no dump question ${n}`);
  return q;
};
export const pdfQuestions = lb.bank.questions.filter((q) => q.sourceKind !== "dump");
export const dumpQuestions = lb.bank.questions.filter((q) => q.sourceKind === "dump");
/** Source text as printed (before any owner correction). */
export const original = (q: (typeof lb.bank.questions)[number]) => ({
  englishQuestion: q.correction?.original.englishQuestion ?? q.englishQuestion,
  englishOptions: q.correction?.original.englishOptions ?? q.englishOptions,
  sourceAnswerKey: q.correction?.original.sourceAnswerKey ?? q.sourceAnswerKey,
  sourceExplanation: q.correction?.original.sourceExplanation ?? q.sourceExplanation,
  editorialArtifacts: q.correction?.original.editorialArtifacts ?? q.editorialArtifacts,
});
