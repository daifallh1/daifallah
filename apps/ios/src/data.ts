import { createTranslator, loadBank, loadTranslations } from "@itil5/core";
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
export const categoryLabel = (id: number | null) =>
  id == null ? "Unclassified" : `${id}. ${lb.bank.categories.find((c) => c.id === id)?.name ?? ""}`;
