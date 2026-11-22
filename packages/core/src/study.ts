import type { LoadedBank } from "./bank";
import type { OptionLabel, Question } from "./schema";

/** Study mode browses approved questions only, optionally filtered by syllabus category. */
export function studyQuestions(lb: LoadedBank, category: number | "all"): Question[] {
  return lb.approved
    .filter((q) => category === "all" || q.audit.syllabusCategory === category)
    .sort((a, b) => a.sourceOrdinal - b.sourceOrdinal);
}

/** Immediate feedback is permitted in Study mode (untimed, not an exam). */
export function checkStudyAnswer(q: Question, selected: OptionLabel) {
  return { correct: selected === q.sourceAnswerKey, sourceAnswerKey: q.sourceAnswerKey };
}
