import { useColorScheme } from "react-native";

const light = { bg: "#f7f8fa", surface: "#ffffff", surface2: "#eef1f5", text: "#15191f", muted: "#5b6573", border: "#d5dbe3", accent: "#1f5fbf", accentText: "#ffffff", ok: "#157347", okBg: "#e5f4ec", bad: "#b3261e", badBg: "#fbe9e7", flag: "#c26a00", arBg: "#f1f5ff" };
const dark = { bg: "#111418", surface: "#1a1f26", surface2: "#232a33", text: "#e8ecf1", muted: "#9aa6b4", border: "#333c48", accent: "#6ea8ff", accentText: "#0b1420", ok: "#5cd394", okBg: "#12301f", bad: "#ff8a80", badBg: "#3a1714", flag: "#ffb74d", arBg: "#1d2636" };
export type Palette = typeof light;
export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
