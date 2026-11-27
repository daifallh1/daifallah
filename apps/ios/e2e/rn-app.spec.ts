import { expect, test, type Page } from "@playwright/test";

// React Native UI of the Expo app rendered through react-native-web (NOT an iOS simulator).
const shot = (page: Page, name: string) => page.screenshot({ path: `../../docs/screenshots/ios-rn-web/${name}.png` });
const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => { expect(errors, errors.join("\n")).toEqual([]); });

async function answerAll(page: Page, n: number, pick: (i: number) => "A" | "B" | "C" | "D" | null) {
  for (let i = 0; i < n; i++) {
    const l = pick(i);
    if (l) await page.getByTestId(`select-${l}`).tap();
    if (i < n - 1) await page.getByTestId("next").tap();
  }
}

test("dashboard → fixed exam: tap-to-translate never selects, flag, navigator, submit, result, review", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByText("ITIL 5 Foundation")).toBeVisible();
  await expect(page.getByTestId("fixed-fixed-1")).toContainText("Not started");
  await expect(page.getByText("43 Q").first()).toBeVisible();
  await shot(page, "home-dark");

  await page.getByTestId("fixed-fixed-1").tap();
  await expect(page.getByTestId("exam-title")).toHaveText("Exam 1");
  await expect(page.getByTestId("q-counter")).toHaveText("Question 1 of 43");
  await expect(page.getByLabel(/Time remaining (1:00:00|59:5\d)/)).toBeVisible();

  const radioA = page.getByTestId("select-A");
  await expect(radioA).toHaveAttribute("aria-checked", "false");
  // Tap the English option text: Arabic appears below it and the answer is NOT selected
  await page.getByTestId("option-text-A-en").tap();
  await expect(page.getByTestId("option-text-A-ar")).toContainText(/[؀-ۿ]/);
  await expect(radioA).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("answered-count")).toContainText("0 answered");
  // No "ع" buttons anywhere (owner decision: tap only)
  await expect(page.getByText("ع", { exact: true })).toHaveCount(0);
  await page.getByTestId("stem-en").tap();
  await expect(page.getByTestId("stem-ar")).toBeVisible();
  // The round control selects
  await radioA.tap();
  await expect(radioA).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("answered-count")).toContainText("1 answered");
  await page.getByTestId("flag").tap();
  await expect(page.getByText("⚑ Flagged")).toBeVisible();
  await shot(page, "exam-tap-arabic");

  await page.getByTestId("open-navigator").tap();
  await expect(page.getByText("Question navigator")).toBeVisible();
  await shot(page, "navigator");
  await page.getByText("Submit exam…").tap();
  await expect(page.getByText("Submit exam?")).toBeVisible();
  await expect(page.getByText("42 question(s) unanswered.")).toBeVisible();
  await page.getByTestId("submit-now").tap();
  await expect(page.getByTestId("score")).toContainText("/ 43");
  await expect(page.getByTestId("verdict")).toHaveText("FAIL");
  await expect(page.getByText("Pass mark 28/43 (65%)")).toBeVisible();
  await shot(page, "result");

  await page.getByTestId("review-answers").tap();
  await expect(page.getByText("Review · Exam 1")).toBeVisible();
  await page.getByText(/^All 43$/).tap();
  await expect(page.getByTestId("review-count")).toContainText("43 item(s)");
  await expect(page.getByText("— NOT ANSWERED").first()).toBeVisible();
  await shot(page, "review");

  // persistence across reload (AsyncStorage → localStorage on web)
  await page.reload();
  await expect(page.getByTestId("fixed-fixed-1")).toContainText(/(Passed|Failed) · \d+\/43/);
});

test("mistakes: wrong answers feed one mistakes exam (90 s per question, pass 65%)", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("fixed-fixed-2").tap();
  // answer the first 5 questions with option A and B alternately; some will be wrong
  await answerAll(page, 5, (i) => (i % 2 ? "B" : "A"));
  await page.getByTestId("open-navigator").tap();
  await page.getByText("Submit exam…").tap();
  await page.getByTestId("submit-now").tap();
  await expect(page.getByTestId("score")).toBeVisible();
  const score = Number((await page.getByTestId("score").innerText()).split("/")[0]!.trim());
  const wrong = 5 - score;
  await page.getByTestId("results-home").tap();
  await page.getByTestId("tab-mistakes").tap();
  await expect(page.getByTestId("mistakes-to")).toHaveText(String(wrong));
  await shot(page, "mistakes");
  if (wrong > 0) {
    await page.getByTestId("start-mistakes").tap();
    await expect(page.getByTestId("exam-title")).toHaveText("Mistakes exam");
    await expect(page.getByTestId("q-counter")).toHaveText(`Question 1 of ${wrong}`);
    const secs = wrong * 90;
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    await expect(page.getByLabel(new RegExp(`Time remaining (${mm}:[0-5]\\d|${String(Math.floor(secs / 60) - 1).padStart(2, "0")}:[0-5]\\d)`))).toBeVisible();
  }
});

test("study: full category names, filters, search, bookmark, AI explanation label; settings and about", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-study").tap();
  await page.getByTestId("study-category").tap();
  await page.getByText("4 · The ITIL Value System").tap();
  await expect(page.getByTestId("study-category")).toContainText("4 · The ITIL Value System");
  await page.getByTestId("study-search").fill("Site Reliability Engineering");
  await page.getByTestId("study-category").tap();
  await page.getByText("All categories").tap();
  await expect(page.getByTestId("study-card")).toContainText("Site Reliability Engineering");
  await page.getByTestId("select-A").tap();
  await expect(page.getByText(/^(Correct|Incorrect: the answer is [A-D])$/)).toBeVisible();
  await expect(page.getByText(/AI-written from the Official Book/)).toBeVisible();
  await page.getByTestId("explanation-text-en").tap();
  await expect(page.getByTestId("explanation-text-ar")).toContainText(/[؀-ۿ]/);
  await page.getByTestId("study-save").tap();
  await expect(page.getByText("★ Saved").first()).toBeVisible();
  await shot(page, "study");
  await page.getByTestId("study-search").fill("");
  await page.getByText("ITIL 4 (old)").tap();
  await expect(page.getByText(/ITIL 4 قديم/)).toBeVisible();

  await page.getByTestId("tab-home").tap();
  await page.getByTestId("open-settings").tap();
  await expect(page.getByTestId("export-progress")).toBeVisible();
  await expect(page.getByTestId("import-progress")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByTestId("export-progress").tap();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^ITIL5-progress-\d{4}-\d{2}-\d{2}\.json$/);
  await shot(page, "settings");
  await page.getByTestId("open-about").tap();
  await expect(page.getByText("Exam-eligible / distinct")).toBeVisible();
  await expect(page.getByText("271 / 256")).toBeVisible();
});

test("progress screen with chart and weakest area (light mode)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByTestId("start-random").tap();
  await expect(page.getByTestId("q-counter")).toHaveText("Question 1 of 40");
  await answerAll(page, 40, (i) => (["A", "B", "C", "D"] as const)[i % 4]!);
  await page.getByTestId("submit").tap();
  await page.getByTestId("submit-now").tap();
  await expect(page.getByTestId("score")).toContainText("/ 40");
  await page.getByTestId("results-home").tap();
  await shot(page, "home-light");
  await page.getByTestId("tab-progress").tap();
  await expect(page.getByText("Score trend")).toBeVisible();
  await expect(page.getByTestId("practise-weakest")).toBeVisible();
  await shot(page, "progress");
  await page.getByTestId("practise-weakest").tap();
  await expect(page.getByTestId("study")).toBeVisible();
});
