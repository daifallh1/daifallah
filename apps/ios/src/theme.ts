import { useColorScheme } from "react-native";

const light = {
  bg: "#f4f6fa", surface: "#ffffff", surface2: "#eef1f6", text: "#141a24", muted: "#5d6779", border: "#d9dee8",
  accent: "#2f6fe4", accentText: "#ffffff", accentSoft: "#e5eeff",
  ok: "#17834f", okBg: "#e3f5ec", okBorder: "#9fd8b8",
  bad: "#c4312d", badBg: "#fdecea", badBorder: "#f2b3ae",
  warn: "#b56b00", warnBg: "#fff3df", flag: "#b56b00",
  arBg: "#eef3ff", track: "#e3e8f0", tabBar: "#ffffff",
};
const dark = {
  bg: "#0b0f17", surface: "#151b26", surface2: "#1b2331", text: "#e9edf4", muted: "#8b95a8", border: "#263043",
  accent: "#4c8dff", accentText: "#ffffff", accentSoft: "#14223b",
  ok: "#2fbf71", okBg: "#12261c", okBorder: "#1f5a3a",
  bad: "#f0524f", badBg: "#2a1517", badBorder: "#5a2a2a",
  warn: "#f5a524", warnBg: "#2b2210", flag: "#f5a524",
  arBg: "#14223b", track: "#222b3b", tabBar: "#0e131d",
};
export type Palette = typeof light;
export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
/** Score colour: green at/above the pass line, amber within 15 points below, red otherwise. */
export function scoreColor(p: Palette, percent: number, pass = 65): string {
  return percent >= pass ? p.ok : percent >= pass - 15 ? p.warn : p.bad;
}
