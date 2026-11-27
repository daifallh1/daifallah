import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StoreProvider } from "./store";
import { usePalette } from "./theme";
import { HomeScreen } from "./screens/HomeScreen";
import { ExamScreen } from "./screens/ExamScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { MistakesScreen } from "./screens/MistakesScreen";
import { StudyScreen } from "./screens/StudyScreen";
import { AboutScreen, AuditScreen, CorrectionsScreen, SettingsScreen } from "./screens/SettingsScreens";
import type { RootParams, TabParams } from "./nav";

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();
type IconName = keyof typeof Ionicons.glyphMap;
const icon = (on: IconName, off: IconName) => ({ color, focused, size }: { color: string; focused: boolean; size: number }) =>
  <Ionicons name={focused ? on : off} size={size} color={color} />;

function TabsNav() {
  const p = usePalette();
  return (
    <Tabs.Navigator screenOptions={{
      tabBarLabelStyle: { fontSize: 11 }, tabBarActiveTintColor: p.accent, tabBarInactiveTintColor: p.muted,
      tabBarStyle: { backgroundColor: p.tabBar, borderTopColor: p.border }, headerShown: false, sceneStyle: { backgroundColor: p.bg },
    }}>
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: "Home", tabBarButtonTestID: "tab-home", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="Study" component={StudyScreen} options={{ title: "Study", tabBarButtonTestID: "tab-study", tabBarIcon: icon("book", "book-outline") }} />
      <Tabs.Screen name="Review" component={ReviewScreen} options={{ title: "Review", tabBarButtonTestID: "tab-review", tabBarIcon: icon("checkbox", "checkbox-outline") }} />
      <Tabs.Screen name="Progress" component={ProgressScreen} options={{ title: "Progress", tabBarButtonTestID: "tab-progress", tabBarIcon: icon("stats-chart", "stats-chart-outline") }} />
      <Tabs.Screen name="Mistakes" component={MistakesScreen} options={{ title: "Mistakes", tabBarButtonTestID: "tab-mistakes", tabBarIcon: icon("refresh-circle", "refresh-circle-outline") }} />
    </Tabs.Navigator>
  );
}

function Root() {
  const scheme = useColorScheme();
  const p = usePalette();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: p.bg, card: p.tabBar, text: p.text, border: p.border, primary: p.accent } };
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerTintColor: p.accent, headerTitleStyle: { color: p.text }, headerStyle: { backgroundColor: p.tabBar }, contentStyle: { backgroundColor: p.bg } }}>
        <Stack.Screen name="Tabs" component={TabsNav} options={{ headerShown: false, title: "Back" }} />
        <Stack.Screen name="Exam" component={ExamScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Result" }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: "Question bank" }} />
        <Stack.Screen name="Corrections" component={CorrectionsScreen} options={{ title: "Corrected questions" }} />
        <Stack.Screen name="Audit" component={AuditScreen} options={{ title: "Import audit" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
        <StatusBar style="auto" />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
