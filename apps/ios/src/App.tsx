import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Text, useColorScheme } from "react-native";
import { StoreProvider } from "./store";
import { ExamScreen } from "./screens/ExamScreen";
import { AuditScreen, HomeScreen, MistakesScreen, ProgressScreen, ResultsScreen, ReviewScreen, StudyScreen } from "./screens/OtherScreens";
import type { RootParams, TabParams } from "./nav";

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();
const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }} accessibilityElementsHidden>{g}</Text>;

function TabsNav() {
  return (
    <Tabs.Navigator screenOptions={{ tabBarLabelStyle: { fontSize: 12 } }}>
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: "Home", tabBarButtonTestID: "tab-home", tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="Exam" component={ExamScreen} options={{ title: "Exam", tabBarButtonTestID: "tab-exam", tabBarIcon: icon("⏱") }} />
      <Tabs.Screen name="Study" component={StudyScreen} options={{ title: "Study", tabBarButtonTestID: "tab-study", tabBarIcon: icon("✎") }} />
      <Tabs.Screen name="Review" component={ReviewScreen} options={{ title: "Review", tabBarButtonTestID: "tab-review", tabBarIcon: icon("✗") }} />
      <Tabs.Screen name="Progress" component={ProgressScreen} options={{ title: "Progress", tabBarButtonTestID: "tab-progress", tabBarIcon: icon("▤") }} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack.Navigator>
            <Stack.Screen name="Tabs" component={TabsNav} options={{ headerShown: false }} />
            <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Result" }} />
            <Stack.Screen name="Mistakes" component={MistakesScreen} options={{ title: "Mistakes-Only Practice" }} />
            <Stack.Screen name="Audit" component={AuditScreen} options={{ title: "Import Audit" }} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
