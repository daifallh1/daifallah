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

test("study 'Not studied': answering keeps the question on screen; Next shows a fresh, unanswered question", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tab-study").tap();
  await page.getByText(/^Not studied \d+$/).tap();
  const first = await page.getByTestId("stem-en").innerText();
  await page.getByTestId("select-A").tap();
  // the chip count drops, but the answered question and its explanation stay on screen
  await expect(page.getByText(/^Not studied 270$/)).toBeVisible();
  await expect(page.getByTestId("stem-en")).toHaveText(first);
  await expect(page.getByTestId("explanation")).toBeVisible();
  await expect(page.getByTestId("select-A")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("study-next").tap();
  await expect(page.getByTestId("stem-en")).not.toHaveText(first);
  for (const l of ["A", "B", "C", "D"]) await expect(page.getByTestId(`select-${l}`)).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("explanation")).toHaveCount(0);
  await page.getByTestId("select-B").tap();
  await expect(page.getByText(/^Not studied 269$/)).toBeVisible();
  await page.getByText("‹ Previous").tap();
  await expect(page.getByTestId("stem-en")).toHaveText(first);
});

test("timer: a fixed exam auto-submits at 60:00 and the result says time is up", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByTestId("fixed-fixed-4").tap();
  await page.getByTestId("select-A").tap();
  await page.clock.fastForward("50:30");
  await expect(page.getByText(/10 minutes left/)).toBeVisible();
  await page.clock.fastForward("10:00");
  await expect(page.getByText(/Time is up/)).toBeVisible();
  await expect(page.getByTestId("score")).toContainText("/ 43");
  await expect(page.getByText(/Elapsed 1:00:00 · auto-submitted/)).toBeVisible();
});

test("leave an exam, resume it from Home with answers kept; starting another asks first", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("fixed-fixed-5").tap();
  await page.getByTestId("select-C").tap();
  await page.getByTestId("next").tap();
  await page.getByTestId("exam-leave").tap(); // window.confirm accepted by the test
  await expect(page.getByTestId("resume-card")).toContainText("Exam 5 · 1/42 answered");
  await expect(page.getByTestId("fixed-fixed-5")).toContainText("In progress · 1/42");
  await page.getByTestId("resume-card").tap();
  await expect(page.getByTestId("q-counter")).toHaveText("Question 2 of 42");
  await page.getByTestId("prev").tap();
  await expect(page.getByTestId("select-C")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("exam-leave").tap();
  // starting a different exam asks to discard (accepted) and starts Exam 6
  await page.getByTestId("fixed-fixed-6").tap();
  await expect(page.getByTestId("exam-title")).toHaveText("Exam 6");
  await expect(page.getByTestId("answered-count")).toContainText("0 answered");
});

test("backup: export, wipe, import restores exams and saved questions", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("fixed-fixed-1").tap();
  await page.getByTestId("select-A").tap();
  await page.getByTestId("open-navigator").tap();
  await page.getByText("Submit exam…").tap();
  await page.getByTestId("submit-now").tap();
  await page.getByTestId("results-home").tap();
  await page.getByTestId("open-settings").tap();
  const dl = page.waitForEvent("download");
  await page.getByTestId("export-progress").tap();
  const file = await (await dl).path();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByTestId("fixed-fixed-1")).toContainText("Not started");
  await page.getByTestId("open-settings").tap();
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("import-progress").tap();
  await (await chooser).setFiles(file!);
  await expect(page.getByText(/On this iPhone: 1 exams/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("fixed-fixed-1")).toContainText(/Failed · \d+\/43/);
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
