import bankJson from "@itil5/content/web/bank.json";
import trJson from "@itil5/content/web/translations.ar.json";
import { createTranslator, loadBank, loadTranslations } from "@itil5/core";

/** Bank + Arabic overlay are bundled into the app so they work offline (no network translation calls). */
export const lb = loadBank(bankJson);
export const translations = loadTranslations(trJson, lb.bank);
export const t = createTranslator(translations);
export const categoryLabel = (id: number | null) =>
  id == null ? "Unclassified" : `${id}. ${lb.bank.categories.find((c) => c.id === id)?.name ?? ""}`;
