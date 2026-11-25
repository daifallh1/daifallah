import { expect, test } from "@playwright/test";
import { noHorizontalScroll, startExam } from "./helpers";

const widths = [320, 375, 390, 428, 768, 1024, 1440];

for (const w of widths) {
  test(`layout at ${w}px: no horizontal scroll on home, exam and study`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w < 768 ? 800 : 900 });
    await page.goto("/");
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: `../../docs/screenshots/web/home-${w}.png` });
    await startExam(page);
    await page.locator(".exam-main .option").nth(1).locator(".tr-en").click();
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: `../../docs/screenshots/web/exam-${w}.png` });
    await page.goto("/study/");
    await page.locator(".option input").first().check();
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.screenshot({ path: `../../docs/screenshots/web/study-${w}.png`, fullPage: w >= 1024 });
  });
}

test("dark mode renders", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1024, height: 800 });
  await startExam(page);
  await page.locator(".exam-main .stem .tr-en").hover();
  await page.screenshot({ path: "../../docs/screenshots/web/exam-dark-1024.png" });
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(17, 20, 24)");
});

test("installed PWA keeps working offline (bank + Arabic bundled)", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // controlled by SW now
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto("/study/");
  await expect(page.locator(".stem")).toBeVisible();
  await page.locator(".stem .tr-en").click();
  await expect(page.locator(".stem .tr-ar")).toBeVisible();
  await page.goto("/exam/");
  await page.getByRole("button", { name: /Start exam/ }).click();
  await expect(page.locator(".exam-main .stem")).toBeVisible();
  await context.setOffline(false);
});

test("audit page shows quarantine and counts", async ({ page }) => {
  await page.goto("/audit/");
  await expect(page.getByText("answerKeyLines")).toBeVisible();
  await expect(page.getByText(/Quarantined \/ excluded items \(25\)/)).toBeVisible();
  await expect(page.getByText(/editorial_artifact/).first()).toBeVisible();
  await page.screenshot({ path: "../../docs/screenshots/web/audit-1280.png" });
});
