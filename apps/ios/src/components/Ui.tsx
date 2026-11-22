import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { usePalette } from "../theme";

export function Button({ title, onPress, kind = "default", disabled, accessibilityHint, style }: {
  title: string; onPress: () => void; kind?: "default" | "primary" | "danger" | "flag"; disabled?: boolean; accessibilityHint?: string; style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const bg = kind === "primary" ? p.accent : kind === "danger" ? p.bad : p.surface;
  const fg = kind === "primary" ? p.accentText : kind === "danger" ? "#fff" : kind === "flag" ? p.flag : p.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: kind === "flag" ? p.flag : kind === "default" ? p.border : bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[s.card, { backgroundColor: p.surface, borderColor: p.border }, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text accessibilityRole="header" style={[s.h1, { color: p.text }]}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text accessibilityRole="header" style={[s.h2, { color: p.text }]}>{children}</Text>;
}
export function P({ children, muted, small }: { children: ReactNode; muted?: boolean; small?: boolean }) {
  const p = usePalette();
  return <Text style={{ color: muted ? p.muted : p.text, fontSize: small ? 13 : 16, lineHeight: small ? 18 : 23, marginVertical: 4 }}>{children}</Text>;
}

const s = StyleSheet.create({
  btn: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 6 },
  h1: { fontSize: 24, fontWeight: "700", marginVertical: 8 },
  h2: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 6 },
});
