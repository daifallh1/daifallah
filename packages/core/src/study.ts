import type { LoadedBank } from "./bank";
import type { OptionLabel, Question } from "./schema";

const sourceRank = (q: Question) => (q.sourceKind === "dump" ? 1 : 0);

/**
 * Study mode browses approved questions, optionally filtered by syllabus category. With
 * `includeLegacy`, ITIL 4 legacy items (study only, never in exams) are appended and labelled by the UI.
 */
export function studyQuestions(lb: LoadedBank, category: number | "all", opts: { includeLegacy?: boolean } = {}): Question[] {
  const legacy = opts.includeLegacy ? lb.bank.questions.filter((q) => q.audit.legacy && q.audit.contentStatus === "out_of_scope") : [];
  return [
    ...lb.approved
      .filter((q) => category === "all" || q.audit.syllabusCategory === category)
      .sort((a, b) => sourceRank(a) - sourceRank(b) || a.sourceOrdinal - b.sourceOrdinal),
    ...(category === "all" ? legacy.sort((a, b) => a.sourceOrdinal - b.sourceOrdinal) : []),
  ];
}

/** Immediate feedback is permitted in Study mode (untimed, not an exam). */
export function checkStudyAnswer(q: Question, selected: OptionLabel) {
  return { correct: selected === q.sourceAnswerKey, sourceAnswerKey: q.sourceAnswerKey };
}
