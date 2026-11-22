import type { Question, TranslationBundle } from "./schema";

/** English UI strings. Every key must have an Arabic counterpart in translations/ui.ar.json (tested). */
export const UI_EN = {
  "app.title": "ITIL Foundation (Version 5) Exam Simulator",
  "app.disclaimer":
    "Independent practice tool. Not affiliated with, endorsed by, or an official product of PeopleCert or AXELOS. ITIL® is a registered trademark of PeopleCert. Questions are reproduced verbatim from the owner-supplied PDF.",
  "nav.home": "Home",
  "nav.exam": "Full Exam",
  "nav.study": "Study Mode",
  "nav.review": "Wrong Answers Review",
  "nav.mistakes": "Mistakes-Only Practice",
  "nav.progress": "Progress & Weak Areas",
  "nav.audit": "Import Audit Report",
  "nav.settings": "Settings",
  "exam.start": "Start a 40-question exam",
  "exam.duration": "Duration",
  "exam.minutes": "minutes",
  "exam.extended": "Extended time (75 minutes) for candidates not sitting in their native or working language",
  "exam.question": "Question",
  "exam.of": "of",
  "exam.flag": "Flag for review",
  "exam.unflag": "Remove flag",
  "exam.previous": "Previous",
  "exam.next": "Next",
  "exam.navigator": "Question navigator",
  "exam.answered": "Answered",
  "exam.unanswered": "Unanswered",
  "exam.flagged": "Flagged",
  "exam.submit": "Submit exam",
  "exam.confirmSubmit": "Submit the exam now? Answers cannot be changed after submission.",
  "exam.unansweredWarning": "You have unanswered questions",
  "exam.cancel": "Cancel",
  "exam.timeRemaining": "Time remaining",
  "exam.timeUp": "Time is up. The exam was submitted automatically.",
  "exam.resume": "Resume exam in progress",
  "exam.discard": "Discard exam in progress",
  "exam.blueprintCompliant": "Matches the official syllabus blueprint",
  "exam.notCompliant": "Not fully blueprint-compliant",
  "exam.closedBook": "Closed book: no answers or explanations are shown before submission.",
  "result.score": "Score",
  "result.percent": "Percentage",
  "result.pass": "PASS",
  "result.fail": "FAIL",
  "result.passMark": "Pass mark 26 of 40 (65%)",
  "result.elapsed": "Elapsed time",
  "result.byCategory": "Result by syllabus category",
  "result.reviewWrong": "Review wrong answers",
  "review.yourAnswer": "Your answer",
  "review.correctAnswer": "Correct answer (source key)",
  "review.noAnswer": "Not answered",
  "review.sourceExplanation": "Source explanation",
  "review.noSourceExplanation": "The source PDF provides no explanation for this question. No explanation has been invented.",
  "review.source": "Source",
  "review.page": "page",
  "review.printedNumber": "printed question no.",
  "review.markStudied": "Studied",
  "review.markConfusing": "Still confusing",
  "review.markMastered": "Mastered",
  "review.none": "No wrong answers to review yet.",
  "review.whyNote": "Reasons why an option is right or wrong are shown only where the source explanation supports them.",
  "study.category": "Syllabus category",
  "study.all": "All",
  "study.showAnswer": "Check answer",
  "study.correct": "Correct",
  "study.incorrect": "Incorrect",
  "mistakes.start": "Start mistakes practice",
  "mistakes.empty": "No previous mistakes yet. Complete an exam first.",
  "mistakes.timesWrong": "Times wrong",
  "progress.attempts": "Attempts",
  "progress.passRate": "Pass rate",
  "progress.latest": "Latest attempt",
  "progress.last7": "Last 7 days",
  "progress.last30": "Last 30 days",
  "progress.noData": "No data yet",
  "progress.accuracyByCategory": "Accuracy by syllabus category",
  "progress.frequentlyMissed": "Most frequently missed",
  "progress.observed": "Observed performance",
  "translate.show": "Show Arabic translation",
  "translate.hide": "Hide translation",
  "translate.missing": "Translation not available",
  "translate.hint": "Hover over or click the English text to see the Arabic translation. Answers are selected only with the radio control.",
  "translate.aiNote": "AI-generated translation, not yet reviewed by a human; the English text is authoritative.",
  "settings.theme": "Theme",
  "settings.offline": "The app works offline after the first load.",
  "common.close": "Close",
  "common.back": "Back",
} as const;

export type UiKey = keyof typeof UI_EN;

export interface Translator {
  /** Arabic for an exact English bank string by its i18n key, or null when missing (never guessed). */
  content(key: string | null | undefined): string | null;
  ui(key: UiKey): { en: string; ar: string | null };
}

export function createTranslator(bundle: TranslationBundle | null): Translator {
  return {
    content(key) {
      if (!key || !bundle) return null;
      return bundle.content[key]?.ar ?? null;
    },
    ui(key) {
      return { en: UI_EN[key], ar: bundle?.ui[key] ?? null };
    },
  };
}

/** True when the question, its four options and (if present) its explanation all have Arabic. */
export function questionFullyTranslated(q: Question, bundle: TranslationBundle): boolean {
  const keys = [q.i18n.question, q.i18n.options.A, q.i18n.options.B, q.i18n.options.C, q.i18n.options.D];
  if (q.i18n.explanation) keys.push(q.i18n.explanation);
  return keys.every((k) => !!bundle.content[k]?.ar);
}
