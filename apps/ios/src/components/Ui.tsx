import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTopInset } from "../appInfo";
import { usePalette } from "../theme";

/** Screen container. `safeTop` keeps content below the status bar / Dynamic Island on header-less tab screens. */
export function Screen({ children, scroll = true, testID, safeTop }: { children: ReactNode; scroll?: boolean; testID?: string; safeTop?: boolean }) {
  const p = usePalette();
  const insetTop = useTopInset();
  const top = safeTop ? insetTop + 8 : 16;
  // Opaque strip behind the status bar so scrolled content never shows under the clock/battery.
  const shield = safeTop ? <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insetTop, backgroundColor: p.bg }} /> : null;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: p.bg, padding: 16, paddingTop: top }} testID={testID}>{children}{shield}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={{ padding: 16, paddingTop: top, paddingBottom: 48 }} testID={testID}
        scrollIndicatorInsets={safeTop ? { top: insetTop } : undefined} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {children}
      </ScrollView>
      {shield}
    </View>
  );
}

export function Button({ title, subtitle, onPress, kind = "default", disabled, accessibilityHint, style, testID }: {
  title: string; subtitle?: string; onPress: () => void; kind?: "default" | "primary" | "danger" | "flag" | "ghost";
  disabled?: boolean; accessibilityHint?: string; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const p = usePalette();
  const bg = kind === "primary" ? p.accent : kind === "danger" ? p.bad : kind === "ghost" ? "transparent" : p.surface;
  const fg = kind === "primary" || kind === "danger" ? "#fff" : kind === "flag" ? p.flag : p.text;
  const border = kind === "flag" ? p.flag : kind === "primary" || kind === "danger" ? bg : p.border;
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled }} accessibilityHint={accessibilityHint}
      disabled={disabled} onPress={onPress} testID={testID}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
      {subtitle ? <Text style={[s.btnSub, { color: fg }]}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function Card({ children, style, onPress, testID, accessibilityLabel }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string; accessibilityLabel?: string;
}) {
  const p = usePalette();
  const base = [s.card, { backgroundColor: p.surface, borderColor: p.border }, style];
  if (!onPress) return <View style={base} testID={testID}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.85 : 1 }]}>
      {children}
    </Pressable>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text accessibilityRole="header" style={[s.h1, { color: p.text }]}>{children}</Text>;
}
export function Section({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text accessibilityRole="header" style={[s.section, { color: p.muted }]}>{children}</Text>;
}
export function P({ children, muted, small, style }: { children: ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  return <Text style={[{ color: muted ? p.muted : p.text, fontSize: small ? 13 : 16, lineHeight: small ? 18 : 23 }, style]}>{children}</Text>;
}
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}>{children}</View>;
}

export function Bar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  const p = usePalette();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, backgroundColor: p.track, borderRadius: height, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Pill({ text, color, bg, style }: { text: string; color: string; bg: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }, style]}>
      <Text style={{ color, fontSize: 12.5, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Chips<T extends string | number>({ items, value, onChange }: {
  items: { key: T; label: string }[]; value: T; onChange: (k: T) => void;
}) {
  const p = usePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={String(it.key)} onPress={() => onChange(it.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[s.chip, { borderColor: on ? p.accent : p.border, backgroundColor: on ? p.accent : "transparent" }]}>
            <Text style={{ color: on ? p.accentText : p.muted, fontWeight: "600", fontSize: 13 }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ListRow({ title, subtitle, right, onPress, icon, testID }: {
  title: string; subtitle?: string; right?: string; onPress?: () => void; icon?: ReactNode; testID?: string;
}) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} testID={testID}
      style={({ pressed }) => [s.listRow, { opacity: pressed ? 0.75 : 1 }]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: p.text, fontSize: 16, fontWeight: "600" }}>{title}</Text>
        {subtitle ? <Text style={{ color: p.muted, fontSize: 12.5, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={{ color: p.muted, fontSize: 14 }}>{right}</Text> : null}
      {onPress ? <Text style={{ color: p.muted, fontSize: 18 }}>›</Text> : null}
    </Pressable>
  );
}
export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />;
}

const s = StyleSheet.create({
  btn: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  btnSub: { fontSize: 12.5, fontWeight: "500", opacity: 0.88, marginTop: 2, textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginVertical: 6 },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4, marginTop: 4, marginBottom: 6 },
  section: { fontSize: 13, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 18, marginBottom: 6, marginHorizontal: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
});
