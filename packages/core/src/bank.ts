import { Bank, Question, TranslationBundle } from "./schema";

export interface LoadedBank {
  bank: Bank;
  byId: Map<string, Question>;
  approved: Question[];
  examEligible: Question[];
}

/** Validate and index the bank. Throws if the JSON does not match the schema. */
export function loadBank(json: unknown): LoadedBank {
  const bank = Bank.parse(json);
  const byId = new Map(bank.questions.map((q) => [q.questionId, q]));
  if (byId.size !== bank.questions.length) throw new Error("questionId values must be unique");
  return {
    bank,
    byId,
    approved: bank.questions.filter((q) => q.audit.contentStatus === "approved"),
    examEligible: bank.questions.filter((q) => q.audit.examEligible),
  };
}

export function loadTranslations(json: unknown, bank: Bank): TranslationBundle {
  const t = TranslationBundle.parse(json);
  if (t.bankVersion !== bank.bankVersion) {
    throw new Error(`Translation bundle is for bank ${t.bankVersion}, expected ${bank.bankVersion}`);
  }
  return t;
}

/** Questions that may be shown as practice items (Study/Exam/Mistakes). Quarantined items never qualify. */
export function isPracticeable(q: Question): boolean {
  return q.audit.contentStatus === "approved";
}

export function categoryName(bank: Bank, id: number | null): string {
  if (id == null) return "Unclassified";
  return bank.categories.find((c) => c.id === id)?.name ?? `Category ${id}`;
}
