import { Alert, Platform } from "react-native";

/** Native confirmation dialog (window.confirm on react-native-web, where Alert is a no-op). */
export function confirmAsync(title: string, message: string, ok: string, opts: { cancel?: string; destructive?: boolean } = {}): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: opts.cancel ?? "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: ok, style: opts.destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function notify(title: string, message: string): void {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
