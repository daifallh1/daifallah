import { z } from "zod";

/** Exactly the four source labels; option order is never changed. */
export const OptionLabel = z.enum(["A", "B", "C", "D"]);
export type OptionLabel = z.infer<typeof OptionLabel>;

/** "duplicate" = identical copy of another occurrence, hidden from all practice modes (kept for audit). */
export const ContentStatus = z.enum(["approved", "needs_review", "out_of_scope", "incomplete", "duplicate"]);
export type ContentStatus = z.infer<typeof ContentStatus>;

export const ReviewReason = z.object({
  code: z.string(),
  severity: z.enum(["info", "warning", "blocking", "out_of_scope", "incomplete"]),
  detail: z.string(),
});

export const SourceRegion = z.object({
  page: z.number().int().positive(),
  firstLine: z.number().int().nonnegative(),
  lastLine: z.number().int().nonnegative(),
  bbox: z.array(z.number()).length(4),
});

/** Audit-derived metadata. Never part of the source text. */
export const AuditMeta = z.object({
  derived: z.literal(true),
  questionStyle: z.enum(["standard", "missing_words", "list", "negative"]),
  syllabusCategory: z.number().int().min(1).max(7).nullable(),
  syllabusCriterion: z.string().nullable(),
  syllabusTopic: z.string().nullable(),
  bloomLevel: z.union([z.literal(1), z.literal(2)]).nullable(),
  bloomSource: z.enum(["criterion", "override"]).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  classificationNote: z.string().nullable(),
  contentStatus: ContentStatus,
  reviewReasons: z.array(ReviewReason),
  duplicateGroupId: z.string(),
  duplicateGroupSize: z.number().int().positive(),
  exclusionGroupId: z.string(),
  exclusionGroupSize: z.number().int().positive(),
  /** questionId of the kept copy when this occurrence is a removed identical duplicate, else null. */
  duplicateOf: z.string().nullable().optional(),
  /** ITIL 4 legacy item: shown in Study only (labelled), never in exams. */
  legacy: z.boolean().optional(),
  stemFingerprint: z.string(),
  translationComplete: z.boolean(),
  examEligible: z.boolean(),
});

/** Owner-approved correction checked against the Official Book. The original source text is kept. */
export const Correction = z.object({
  label: z.string(),
  labelEn: z.string(),
  bookReference: z.string(),
  summary: z.string(),
  summaryAr: z.string(),
  original: z.object({
    englishQuestion: z.string().optional(),
    englishOptions: z.array(z.object({ label: OptionLabel, text: z.string() })).optional(),
    sourceAnswerKey: OptionLabel.optional(),
    sourceExplanation: z.string().optional(),
    editorialArtifacts: z.array(z.string()).optional(),
  }),
});
export type Correction = z.infer<typeof Correction>;

/** AI-written explanation based on the Official Book, used only where the source has none. */
export const SupplementaryExplanation = z.object({
  text: z.string().min(1),
  bookReference: z.string(),
  author: z.literal("ai"),
  note: z.string(),
});

export const Question = z.object({
  questionId: z.string().regex(/^itilf5-[0-9a-f]{12}-o\d{3}$/),
  /** "pdf" = ITIL Foundation 11-05-26.pdf, "dump" = second owner-supplied question file. */
  sourceKind: z.enum(["pdf", "dump"]).optional(),
  sourceDocument: z.string(),
  sourceDocumentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourcePage: z.number().int().positive(),
  sourcePagesSpanned: z.array(z.number().int().positive()).min(1),
  sourceRegion: z.array(SourceRegion).min(1),
  sourceOrdinal: z.number().int().positive(),
  /** Printed label from the PDF. NOT unique (103 and 178 are reused). Never use as a key. */
  printedQuestionNumber: z.number().int().positive(),
  englishQuestion: z.string().min(1),
  englishOptions: z
    .array(z.object({ label: OptionLabel, text: z.string().min(1) }))
    .length(4)
    .refine((o) => o.map((x) => x.label).join("") === "ABCD", "options must be A,B,C,D in source order"),
  sourceAnswerKey: OptionLabel,
  sourceExplanation: z.string().nullable(),
  sourceReferenceText: z.string().nullable(),
  editorialArtifacts: z.array(z.string()),
  correction: Correction.nullable().optional(),
  supplementaryExplanation: SupplementaryExplanation.nullable().optional(),
  i18n: z.object({
    question: z.string(),
    options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
    explanation: z.string().nullable(),
    supplementaryExplanation: z.string().nullable().optional(),
  }),
  audit: AuditMeta,
});
export type Question = z.infer<typeof Question>;

export const Criterion = z.object({
  id: z.string(),
  category: z.number().int(),
  topic: z.string(),
  bl: z.union([z.literal(1), z.literal(2)]),
  text: z.string(),
});

/** One of the six fixed exams that together cover every distinct exam-eligible question once. */
export const FixedExam = z.object({
  examId: z.string(),
  title: z.string(),
  questionIds: z.array(z.string()).min(1),
  durationMinutes: z.number().int().positive(),
  passMark: z.number().int().positive(),
  passPercent: z.number(),
  categoryCounts: z.record(z.number().int()),
  bloomCounts: z.record(z.number().int()),
});
export type FixedExam = z.infer<typeof FixedExam>;

export const Bank = z.object({
  schemaVersion: z.literal(1),
  bankVersion: z.string(),
  bankContentHash: z.string(),
  sourceDocument: z.string(),
  sourceDocumentSha256: z.string(),
  syllabus: z.object({ version: z.string(), published: z.string(), sha256: z.string() }),
  examSpec: z.object({
    questions: z.literal(40),
    durationMinutes: z.literal(60),
    extendedDurationMinutes: z.literal(75),
    extendedDurationNote: z.string(),
    passMark: z.literal(26),
    marksPerQuestion: z.literal(1),
    negativeMarking: z.literal(false),
    optionsPerQuestion: z.literal(4),
    bloomShare: z.record(z.number()),
    bloomCounts: z.object({ "1": z.number().int(), "2": z.number().int() }),
    questionStyles: z.array(z.string()),
  }),
  categories: z.array(z.object({ id: z.number().int(), name: z.string(), weight: z.number(), questions: z.number().int() })).length(7),
  criteria: z.array(Criterion),
  notice: z.string(),
  sources: z.array(z.object({ kind: z.string(), document: z.string(), sha256: z.string() })).optional(),
  fixedExams: z.array(FixedExam).optional(),
  questionCount: z.number().int(),
  questions: z.array(Question),
});
export type Bank = z.infer<typeof Bank>;

export const TranslationBundle = z.object({
  language: z.literal("ar"),
  bankVersion: z.string(),
  content: z.record(z.object({ en: z.string(), ar: z.string() })),
  ui: z.record(z.string()),
});
export type TranslationBundle = z.infer<typeof TranslationBundle>;

/** Answer snapshot persisted per attempt so history stays accurate if the bank is later re-versioned. */
export const AttemptItem = z.object({
  questionId: z.string(),
  selected: OptionLabel.nullable(),
  sourceAnswerKey: OptionLabel,
  correct: z.boolean(),
  flagged: z.boolean(),
  category: z.number().int().nullable(),
  snapshot: z.object({
    englishQuestion: z.string(),
    englishOptions: z.array(z.object({ label: OptionLabel, text: z.string() })),
    sourceExplanation: z.string().nullable(),
    sourcePage: z.number().int(),
    printedQuestionNumber: z.number().int(),
  }),
});
export type AttemptItem = z.infer<typeof AttemptItem>;

export const AttemptMode = z.enum(["exam", "mistakes", "fixed"]);
export type AttemptMode = z.infer<typeof AttemptMode>;

export const Attempt = z.object({
  attemptId: z.string(),
  mode: AttemptMode,
  bankVersion: z.string(),
  startedAt: z.number(),
  submittedAt: z.number(),
  durationMs: z.number(),
  elapsedMs: z.number(),
  submittedBy: z.enum(["user", "timer"]),
  blueprintCompliant: z.boolean(),
  /** For mode "fixed": which fixed exam (e.g. "fixed-3"). */
  examId: z.string().optional(),
  /** Pass mark used for this attempt (score >= passMark passes). Absent on older attempts. */
  passMark: z.number().int().optional(),
  items: z.array(AttemptItem),
  score: z.number().int(),
  total: z.number().int(),
  passed: z.boolean().nullable(),
});
export type Attempt = z.infer<typeof Attempt>;

export const StudyMark = z.enum(["studied", "confusing", "mastered"]);
export type StudyMark = z.infer<typeof StudyMark>;
export const MarkEvent = z.object({ questionId: z.string(), mark: StudyMark, at: z.number() });
export type MarkEvent = z.infer<typeof MarkEvent>;
