import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadBank, loadTranslations } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
export const contentDir = resolve(here, "../../content");
export const readJson = (p: string) => JSON.parse(readFileSync(resolve(contentDir, p), "utf8"));
export const lb = loadBank(readJson("build/bank.json"));
export const tr = loadTranslations(readJson("build/translations.ar.json"), lb.bank);
export const byOrdinal = (n: number) => {
  const q = lb.bank.questions.find((x) => x.sourceOrdinal === n);
  if (!q) throw new Error(`no ordinal ${n}`);
  return q;
};
