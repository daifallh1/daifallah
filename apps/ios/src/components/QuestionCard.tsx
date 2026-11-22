import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OptionLabel, Question } from "@itil5/core";
import { usePalette } from "../theme";
import { TrText } from "./TrText";

/** Verbatim source question. The left "select zone" chooses an answer; the text only toggles Arabic. */
export function QuestionCard({ q, selected, onSelect, showKey, disabled }: {
  q: Question; selected?: OptionLabel | null; onSelect?: (l: OptionLabel) => void; showKey?: boolean; disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <View>
      <TrText k={q.i18n.question} style={{ fontSize: 18, lineHeight: 26, fontWeight: "600" }} testID="stem">{q.englishQuestion}</TrText>
      <View accessibilityRole="radiogroup" style={{ marginTop: 12, gap: 10 }}>
        {q.englishOptions.map((o) => {
          const isSel = selected === o.label;
          const isKey = showKey && o.label === q.sourceAnswerKey;
          const isWrong = showKey && isSel && !isKey;
          return (
            <View key={o.label} style={[s.option, { backgroundColor: isKey ? p.okBg : isWrong ? p.badBg : p.surface, borderColor: isKey ? p.ok : isWrong ? p.bad : isSel ? p.accent : p.border, borderWidth: isSel ? 2 : 1 }]}>
              <Pressable
                onPress={() => onSelect?.(o.label)}
                disabled={disabled || !onSelect}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSel, disabled: disabled || !onSelect }}
                aria-checked={isSel}
                accessibilityLabel={`Select option ${o.label}: ${o.text}`}
                style={[s.zone, { backgroundColor: p.surface2, borderColor: p.border }]}
                testID={`select-${o.label}`}
              >
                <View style={[s.radio, { borderColor: isSel ? p.accent : p.muted }]}>{isSel && <View style={[s.dot, { backgroundColor: p.accent }]} />}</View>
                <Text style={{ color: p.text, fontWeight: "700", fontSize: 16 }}>{o.label}</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <TrText k={q.i18n.options[o.label]} testID={`option-text-${o.label}`}>{o.text}</TrText>
                {isKey && <Text style={[s.badge, { backgroundColor: p.ok }]}>Source key</Text>}
                {isWrong && <Text style={[s.badge, { backgroundColor: p.bad }]}>Your answer</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: "row", gap: 10, padding: 8, borderRadius: 12, alignItems: "stretch" },
  zone: { minWidth: 68, minHeight: 48, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: 6 },
  badge: { alignSelf: "flex-start", color: "#fff", fontSize: 12, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 6, overflow: "hidden" },
});
