import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { t } from "../data";
import { usePalette } from "../theme";

/**
 * English text with tap-to-translate (owner decision: tap only, no "ع" buttons, no global switch).
 *  - Tap the English sentence to show its Arabic translation directly below; tap again to hide.
 *  - This never selects an answer: answers are chosen only with the separate radio control.
 *  - Arabic is right-to-left and follows Dynamic Type.
 */
export function TrText({ k, ar, children, style, testID, tone }: {
  k?: string | null; ar?: string | null; children: string; style?: StyleProp<TextStyle>; testID?: string; tone?: "ok" | "bad";
}) {
  const p = usePalette();
  const arabic = ar ?? t.content(k ?? null);
  const [open, setOpen] = useState(false);
  const edge = tone === "ok" ? p.ok : tone === "bad" ? p.bad : p.accent;
  return (
    <View style={s.wrap} testID={testID}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [s.en, { backgroundColor: open || pressed ? p.arBg : "transparent" }]}
        accessibilityRole="button"
        accessibilityLabel={children}
        accessibilityHint={open ? "Hides the Arabic translation" : "Shows the Arabic translation"}
        accessibilityState={{ expanded: open }}
        testID={testID ? `${testID}-en` : undefined}
      >
        <Text style={[{ color: p.text, fontSize: 16, lineHeight: 23, textAlign: "left" }, style]}>{children}</Text>
      </Pressable>
      {open && (
        <View style={[s.ar, { backgroundColor: p.arBg, borderRightColor: edge }]} accessibilityLanguage="ar" testID={testID ? `${testID}-ar` : "ar-panel"}>
          <Text style={[s.arText, { color: p.text }]} accessibilityLanguage="ar">{arabic ? isolateLatin(arabic) : "الترجمة غير متوفرة · Translation not available"}</Text>
        </View>
      )}
    </View>
  );
}

/** Keep English terms inside Arabic text in reading order, e.g. «تدفقات القيمة (Value streams)». */
export function isolateLatin(ar: string): string {
  return ar.replace(/[A-Za-z][A-Za-z0-9’'&/-]*(?:[ .,:+]{1,2}[A-Za-z0-9][A-Za-z0-9’'&/-]*)*/g, (m) => `\u2066${m}\u2069`);
}

const s = StyleSheet.create({
  wrap: { flexShrink: 1, flexGrow: 1 },
  en: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 3, marginHorizontal: -3 },
  ar: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderRightWidth: 3 },
  arText: { fontSize: 17, lineHeight: 28, writingDirection: "rtl", textAlign: "right" },
});
