import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { t } from "../data";
import { usePalette } from "../theme";

/**
 * English text with tap-to-reveal Arabic (iOS / touch).
 *  - Tap the English text (or the "ع" button) to show Arabic below it; tap again to hide.
 *  - This control never selects an answer; selection is a separate radio control.
 *  - Arabic is rendered right-to-left and respects Dynamic Type (font scaling).
 */
export function TrText({ k, ar, children, style, testID }: {
  k?: string | null; ar?: string | null; children: string; style?: StyleProp<TextStyle>; testID?: string;
}) {
  const p = usePalette();
  const arabic = ar ?? t.content(k ?? null);
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  return (
    <View style={s.wrap} testID={testID}>
      <View style={s.row}>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [s.en, { backgroundColor: open || pressed ? p.arBg : "transparent" }]}
          accessibilityRole="button"
          accessibilityLabel={children}
          accessibilityHint={open ? "Hides the Arabic translation" : "Shows the Arabic translation"}
          accessibilityState={{ expanded: open }}
        >
          <Text style={[{ color: p.text, fontSize: 16, lineHeight: 23 }, style]}>{children}</Text>
        </Pressable>
        <Pressable
          onPress={toggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={open ? "Hide Arabic translation" : "Show Arabic translation"}
          style={[s.btn, { borderColor: open ? p.accent : p.border, backgroundColor: open ? p.accent : p.surface }]}
        >
          <Text style={{ color: open ? p.accentText : p.muted, fontSize: 15 }}>ع</Text>
        </Pressable>
      </View>
      {open && (
        <View style={[s.ar, { backgroundColor: p.arBg, borderRightColor: p.accent }]} accessibilityLanguage="ar" testID={testID ? `${testID}-ar` : "ar-panel"}>
          <Text style={[s.arText, { color: p.text }]} accessibilityLanguage="ar">{arabic ?? "الترجمة غير متوفرة · Translation not available"}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexShrink: 1, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  en: { flex: 1, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 2 },
  btn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ar: { marginTop: 6, padding: 10, borderRadius: 8, borderRightWidth: 3 },
  arText: { fontSize: 17, lineHeight: 28, writingDirection: "rtl", textAlign: "right" },
});
