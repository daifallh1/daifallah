import { Text, View } from "react-native";
import type { Question } from "@itil5/core";
import { categoryLabel, t } from "../data";
import { usePalette } from "../theme";
import { Card } from "./Ui";
import { TrText } from "./TrText";

export function Explanation({ q }: { q: Question }) {
  const p = usePalette();
  const label = t.ui("review.sourceExplanation");
  return (
    <Card>
      <TrText ar={label.ar} style={{ fontWeight: "700" }}>{label.en}</TrText>
      <View style={{ height: 6 }} />
      {q.sourceExplanation ? (
        <TrText k={q.i18n.explanation}>{q.sourceExplanation}</TrText>
      ) : (
        <TrText ar={t.ui("review.noSourceExplanation").ar} style={{ color: p.muted }}>{t.ui("review.noSourceExplanation").en}</TrText>
      )}
      <Text style={{ color: p.muted, fontSize: 12, marginTop: 8 }}>
        Source: {q.sourceDocument}, page {q.sourcePagesSpanned.join("–")} · printed Q{q.printedQuestionNumber} · occurrence #{q.sourceOrdinal}
        {q.sourceReferenceText ? ` · citation in source: “${q.sourceReferenceText}” (not independently verified)` : ""}
        {"\n"}Audit metadata: {categoryLabel(q.audit.syllabusCategory)} · criterion {q.audit.syllabusCriterion ?? "—"} · Bloom {q.audit.bloomLevel ?? "—"}
      </Text>
    </Card>
  );
}
