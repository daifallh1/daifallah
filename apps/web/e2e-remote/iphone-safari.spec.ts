import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Answer keys come from the same committed bank the deployment was built from (used only to drive answers).
const bank = JSON.parse(readFileSync(resolve(__dirname, "../../../packages/content/web-frozen/bank.json"), "utf8"));
const keyOf = new Map<string, string>(bank.questions.map((q: { questionId: string; sourceAnswerKey: string }) => [q.questionId, q.sourceAnswerKey]));
const shot = (n: string) => `../../docs/screenshots/vercel-iphone-webkit/${n}.png`;

async function qid(page: Page) {
  const name = await page.locator('.exam-main input[type="radio"]').first().getAttribute("name");
  return name!.replace(/^q-/, "");
}
async function start(page: Page) {
  await page.goto("/exam/");
  await page.getByRole("button", { name: /Start exam \(60 minutes\)/ }).tap();
  await page.locator(".exam-main .stem").waitFor();
}
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test("deployment serves the app on iPhone WebKit (not the Vercel login page)", async ({ page, browserName }) => {
  expect(browserName).toBe("webkit");
  const ua = await page.evaluate(() => navigator.userAgent);
  expect(ua).toMatch(/iPhone.*Mobile.*Safari/);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ITIL Foundation (Version 5) Exam Simulator");
  expect(await noHScroll(page)).toBe(true);
  await page.screenshot({ path: shot("01-home") });
});

test("exam: 40 questions, 60:00 timer, tap Arabic without selecting, select, flag, navigator, resume", async ({ page }) => {
  await start(page);
  await expect(page.locator(".exam-bar")).toContainText("Question 1 / 40");
  await expect(page.locator(".timer")).toContainText(/1:00:00|59:5\d/);
  const id = await qid(page);
  const optA = page.locator(".exam-main .option").first();
  await optA.locator(".tr-en").tap();
  const ar = optA.locator(".tr-ar");
  await expect(ar).toBeVisible();
  await expect(ar).toHaveAttribute("dir", "rtl");
  await expect(ar).toContainText(/[؀-ۿ]/);
  await expect(page.locator(`#q-${id}-A`)).not.toBeChecked();
  await page.screenshot({ path: shot("02-exam-arabic-tap") });
  await page.locator(`label[for="q-${id}-A"]`).tap();
  await expect(page.locator(`#q-${id}-A`)).toBeChecked();
  await page.getByRole("button", { name: /Flag for review/ }).tap();
  await expect(page.locator(".exam-bar")).toContainText("1 answered · 39 unanswered · 1 flagged");
  await page.getByRole("button", { name: "Next →" }).tap();
  await expect(page.locator(".exam-bar")).toContainText("Question 2 / 40");
  await page.getByRole("button", { name: /Show question navigator/ }).tap();
  await expect(page.locator("#navigator")).toBeVisible();
  await page.screenshot({ path: shot("03-navigator") });
  expect(await noHScroll(page)).toBe(true);
  await page.reload();
  await page.locator(".exam-main .stem").waitFor();
  await expect(page.locator(".exam-bar")).toContainText("1 answered · 39 unanswered · 1 flagged");
});

test("full attempt: 26/40 PASS, wrong-answer review with source key, explanation and Arabic", async ({ page }) => {
  await start(page);
  for (let i = 0; i < 40; i++) {
    const id = await qid(page);
    const key = keyOf.get(id)!;
    expect(key, `question ${id} must exist in the committed bank`).toBeTruthy();
    const pick = i < 26 ? key : key === "A" ? "B" : "A";
    await page.locator(`label[for="q-${id}-${pick}"]`).tap();
    if (i < 39) await page.getByRole("button", { name: "Next →" }).tap();
  }
  await page.getByRole("button", { name: "Review & submit" }).tap();
  await page.getByRole("button", { name: "Submit now" }).tap();
  await expect(page.getByTestId("score")).toHaveText("26");
  await expect(page.getByTestId("result")).toContainText("PASS");
  await expect(page.getByTestId("result")).toContainText("65%");
  await page.screenshot({ path: shot("04-result-pass") });
  await page.getByRole("link", { name: /Review wrong answers \(14\)/ }).tap();
  const items = page.getByTestId("wrong-item");
  await expect(items).toHaveCount(14);
  const first = items.first();
  await expect(first.locator(".badge.ok")).toHaveText("Source key");
  await expect(first.locator(".badge.bad")).toHaveText("Your answer");
  await expect(first).toContainText("Source: ITIL Foundation 11-05-26.pdf, page");
  const expl = first.locator(".explanation");
  await expect(expl).toBeVisible();
  // Tap the explanation text itself (or the heading when the PDF has no explanation) and check THAT element's Arabic.
  const target = (await expl.locator(".expl-text").count()) ? expl.locator(".expl-text") : expl.locator("h3 .tr").first();
  await target.locator(".tr-en").first().tap();
  await expect(target.locator(".tr-ar").first()).toBeVisible();
  await expect(target.locator(".tr-ar").first()).toContainText(/[\u0600-\u06FF]/);
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("05-review-arabic") });
  expect(await noHScroll(page)).toBe(true);
});

test("timer auto-submits at 60:00", async ({ page }) => {
  await page.clock.install();
  await start(page);
  const id = await qid(page);
  await page.locator(`label[for="q-${id}-${keyOf.get(id)}"]`).tap();
  await page.clock.fastForward(60 * 60_000 + 5_000);
  await expect(page).toHaveURL(/\/results\/.*timeout=1/, { timeout: 20_000 });
  await expect(page.getByText(/Time is up/)).toBeVisible();
  await expect(page.getByTestId("score")).toHaveText("1");
  await expect(page.getByTestId("result")).toContainText("Elapsed 1:00:00");
  await page.screenshot({ path: shot("06-timer-auto-submit") });
});
