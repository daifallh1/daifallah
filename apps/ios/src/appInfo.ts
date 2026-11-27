import Constants from "expo-constants";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// app.json is compiled into the bundle, so the version shown always matches the build that was made.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("../app.json") as { expo: { version: string; ios: { buildNumber: string } } };
/** e.g. "1.1.0 (build 6)": shown in Settings and on Home so the installed build can be identified. */
export const APP_VERSION = `${appJson.expo.version} (build ${appJson.expo.ios.buildNumber})`;

/**
 * Top safe-area inset with a fallback: if the safe-area module ever reports 0 on iOS, use the
 * status-bar height measured natively at launch, so content never sits under the clock.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  const fallback = Platform.OS === "ios" ? Constants.statusBarHeight ?? 0 : 0;
  return Math.max(insets.top, fallback);
}
