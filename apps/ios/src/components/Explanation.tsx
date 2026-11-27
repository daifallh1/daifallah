import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Question } from "@itil5/core";
import { categoryLabel } from "../data";
import { usePalette } from "../theme";
import { TrText } from "./TrText";

/** Badge for owner-approved corrections ("معدّل"), with the book reference and what changed. */
export function CorrectionNote({ q }: { q: Question }) {
  const p = usePalette();
  if (!q.correction) return null;
  return (
    <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: p.warnBg, borderWidth: 1, borderColor: p.warn }} testID="correction-note">
      <Text style={{ color: p.warn, fontWeight: "800", fontSize: 13 }}>{`${q.correction.label} · ${q.correction.labelEn} (Official Book ${q.correction.bookReference})`}</Text>
      <TrText ar={q.correction.summaryAr} style={{ fontSize: 13.5, lineHeight: 19 }}>{q.correction.summary}</TrText>
    </View>
  );
}

/** Explanation: the source's own text, or an AI-written one based on the Official Book (labelled). */
export function Explanation({ q }: { q: Question }) {
  const p = usePalette();
  const [more, setMore] = useState(false);
  const supp = q.supplementaryExplanation;
  return (
    <View style={{ marginTop: 12 }} testID="explanation">
      <Text style={{ color: p.muted, fontWeight: "700", fontSize: 13 }}>
        {q.sourceExplanation ? "💡 Explanation" : supp ? `💡 Explanation · AI-written from the Official Book ${supp.bookReference}` : "💡 Explanation"}
      </Text>
      <View style={{ height: 4 }} />
      {q.sourceExplanation ? (
        <TrText k={q.i18n.explanation} style={{ fontSize: 15, lineHeight: 22 }} testID="explanation-text">{q.sourceExplanation}</TrText>
      ) : supp ? (
        <TrText k={q.i18n.supplementaryExplanation} style={{ fontSize: 15, lineHeight: 22 }} testID="explanation-text">{supp.text}</TrText>
      ) : (
        <Text style={{ color: p.muted }}>The source has no explanation for this question.</Text>
      )}
      <CorrectionNote q={q} />
      <Pressable onPress={() => setMore((m) => !m)} accessibilityRole="button" accessibilityState={{ expanded: more }}
        style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: p.muted, fontSize: 13 }}>Source details</Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>{more ? "⌄" : "›"}</Text>
      </Pressable>
      {more && (
        <Text style={{ color: p.muted, fontSize: 12, lineHeight: 17, marginTop: 6 }}>
          {q.sourceDocument}, page {q.sourcePagesSpanned.join("–")} · printed Q{q.printedQuestionNumber}
          {q.sourceReferenceText ? ` · citation in source: “${q.sourceReferenceText}”` : ""}
          {"\n"}{categoryLabel(q.audit.syllabusCategory)} · criterion {q.audit.syllabusCriterion ?? "—"} · Bloom level {q.audit.bloomLevel ?? "—"}
          {supp ? "\nThe explanation above is AI-written (not from the source) and should be checked against the Official Book." : ""}
        </Text>
      )}
    </View>
  );
}
