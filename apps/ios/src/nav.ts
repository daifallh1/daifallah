import type { NavigatorScreenParams } from "@react-navigation/native";
export type TabParams = {
  Home: undefined;
  Study: { category?: number } | undefined;
  Review: { attemptId?: string } | undefined;
  Progress: undefined;
  Mistakes: undefined;
};
export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams>;
  Exam: undefined;
  Results: { attemptId: string; timeout?: boolean };
  Settings: undefined;
  About: undefined;
  Corrections: undefined;
  Audit: undefined;
};
