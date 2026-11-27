import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OptionLabel, Question } from "@itil5/core";
import { usePalette } from "../theme";
import { TrText } from "./TrText";

/**
 * Question with its four options in source order. The round control on the left of each option
 * is the ONLY way to choose an answer; tapping the English text shows its Arabic translation.
 */
export function QuestionCard({ q, selected, onSelect, showKey, disabled }: {
  q: Question; selected?: OptionLabel | null; onSelect?: (l: OptionLabel) => void; showKey?: boolean; disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <View>
      <TrText k={q.i18n.question} style={{ fontSize: 19, lineHeight: 27, fontWeight: "600" }} testID="stem">{q.englishQuestion}</TrText>
      <View accessibilityRole="radiogroup" style={{ marginTop: 14, gap: 9 }}>
        {q.englishOptions.map((o) => {
          const isSel = selected === o.label;
          const isKey = showKey && o.label === q.sourceAnswerKey;
          const isWrong = showKey && isSel && !isKey;
          const border = isKey ? p.ok : isWrong ? p.bad : isSel ? p.accent : p.border;
          const bg = isKey ? p.okBg : isWrong ? p.badBg : isSel ? p.accentSoft : p.surface;
          return (
            <View key={o.label} style={[s.option, { backgroundColor: bg, borderColor: border }]}>
              <Pressable
                onPress={() => onSelect?.(o.label)}
                disabled={disabled || !onSelect}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSel, disabled: disabled || !onSelect }}
                aria-checked={isSel}
                accessibilityLabel={`Select option ${o.label}: ${o.text}`}
                hitSlop={6}
                style={s.zone}
                testID={`select-${o.label}`}
              >
                <View style={[s.radio, { borderColor: isSel ? p.accent : p.muted, backgroundColor: isSel ? p.accent : "transparent" }]}>
                  {isSel && <View style={[s.dot, { backgroundColor: bg }]} />}
                </View>
                <Text style={{ color: isSel ? p.accent : p.muted, fontWeight: "800", fontSize: 15 }}>{o.label}</Text>
              </Pressable>
              <View style={{ flex: 1, paddingVertical: 4 }}>
                <TrText k={q.i18n.options[o.label]} tone={isKey ? "ok" : isWrong ? "bad" : undefined} testID={`option-text-${o.label}`}>{o.text}</TrText>
                {isKey && <Text style={[s.badge, { color: p.ok }]}>✓ Correct answer</Text>}
                {isWrong && <Text style={[s.badge, { color: p.bad }]}>✗ Your answer</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: "row", gap: 6, paddingVertical: 8, paddingRight: 12, paddingLeft: 4, borderRadius: 14, borderWidth: 1.5, alignItems: "stretch" },
  zone: { width: 64, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 9, height: 9, borderRadius: 5 },
  badge: { fontSize: 12.5, fontWeight: "800", marginTop: 4 },
});
