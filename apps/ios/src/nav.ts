import type { NavigatorScreenParams } from "@react-navigation/native";
export type TabParams = { Home: undefined; Exam: undefined; Study: undefined; Review: { attemptId?: string } | undefined; Progress: undefined };
export type RootParams = { Tabs: NavigatorScreenParams<TabParams>; Results: { attemptId: string; timeout?: boolean }; Mistakes: undefined; Audit: undefined };
