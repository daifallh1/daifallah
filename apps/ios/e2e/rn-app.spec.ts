import { expect, test } from "@playwright/test";

const shot = (name: string) => `../../docs/screenshots/ios-rn-web/${name}.png`;

test("Expo app UI (react-native-web render): tap-to-translate, select zone, navigator, submit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ITIL Foundation (Version 5)")).toBeVisible();
  await page.screenshot({ path: shot("home") });

  await page.getByRole("tab", { name: /Exam/ }).click();
  await page.getByText(/Start exam \(60 minutes\)/).click();
  await expect(page.getByText(/⏱ (1:00:00|59:5\d)/)).toBeVisible();

  const radioA = page.getByTestId("select-A");
  await expect(radioA).toHaveAttribute("aria-checked", "false");
  // Tap the English option text: Arabic appears, the answer is NOT selected
  await page.getByTestId("option-text-A").getByRole("button").first().tap();
  await expect(page.getByTestId("option-text-A-ar")).toBeVisible();
  await expect(page.getByTestId("option-text-A-ar")).toContainText(/[\u0600-\u06FF]/);
  await expect(radioA).toHaveAttribute("aria-checked", "false");
  // Tap the select zone: the answer is selected
  await radioA.tap();
  await expect(radioA).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("stem").getByRole("button").first().tap();
  await page.screenshot({ path: shot("exam-arabic") });

  await page.getByText("⚐ Flag").tap();
  await expect(page.getByText("⚑ Flagged")).toBeVisible();
  await page.getByText("☰ All").tap();
  await expect(page.getByText("Question navigator")).toBeVisible();
  await page.screenshot({ path: shot("navigator") });
  await page.getByText("Submit exam…").tap();
  await expect(page.getByText("Submit exam?")).toBeVisible();
  await expect(page.getByText("39 question(s) unanswered.")).toBeVisible();
  await page.getByText("Submit now").tap();
  await expect(page.getByTestId("score")).toContainText("/ 40");
  await expect(page.getByText("FAIL")).toBeVisible();
  await page.screenshot({ path: shot("result") });

  await page.getByText(/Review wrong answers/).tap();
  await expect(page.getByText(/incorrect or unanswered item/)).toBeVisible();
  await page.screenshot({ path: shot("review") });

  // persistence across reload (AsyncStorage → localStorage on web)
  await page.reload();
  await page.getByRole("tab", { name: /Progress/ }).click();
  await expect(page.getByText("Full exams: 1")).toBeVisible();
});

test("Study tab with immediate feedback and Arabic explanation (dark mode)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.getByRole("tab", { name: /Study/ }).click();
  await page.getByTestId("select-B").tap();
  await expect(page.getByText(/^(Correct|Incorrect — source key is [A-D])$/)).toBeVisible();
  await page.getByText("Source explanation").tap();
  await page.screenshot({ path: shot("study-dark") });
});
