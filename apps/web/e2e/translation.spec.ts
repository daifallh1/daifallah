import { expect, test } from "@playwright/test";
import { currentQuestionId, startExam } from "./helpers";

test.describe("Arabic on demand", () => {
  test("desktop: hover shows Arabic, click pins it, keyboard toggles, and none of it selects an answer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startExam(page);
    const id = await currentQuestionId(page);
    const stem = page.locator(".exam-main .stem");
    await expect(stem.locator(".tr-ar")).toBeHidden();
    await stem.locator(".tr-en").hover();
    await expect(stem.locator(".tr-ar")).toBeVisible();
    await expect(stem.locator(".tr-ar")).toHaveAttribute("dir", "rtl");
    await expect(stem.locator(".tr-ar")).toHaveAttribute("lang", "ar");
    await page.mouse.move(5, 5);
    await expect(stem.locator(".tr-ar")).toBeHidden();
    const optB = page.locator(".exam-main .option").nth(1);
    await optB.locator(".tr-en").click();
    await page.mouse.move(5, 5);
    await expect(optB.locator(".tr-ar")).toBeVisible(); // pinned
    await expect(page.locator(`#q-${id}-B`)).not.toBeChecked();
    // Arabic panel sits below the text and does not cover the radio control
    const radio = await page.locator(`label[for="q-${id}-C"]`).boundingBox();
    const panel = await optB.locator(".tr-ar").boundingBox();
    expect(panel!.x).toBeGreaterThan(radio!.x + radio!.width - 1);
    // keyboard
    const optD = page.locator(".exam-main .option").nth(3).locator(".tr-en");
    await optD.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".exam-main .option").nth(3).locator(".tr-ar")).toBeVisible();
    await expect(page.locator(`#q-${id}-D`)).not.toBeChecked();
    await page.screenshot({ path: "../../docs/screenshots/web/exam-desktop-1440-arabic.png", fullPage: false });
  });
});

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  test("tap on English text toggles Arabic and never selects; the radio zone selects", async ({ page }) => {
    await startExam(page);
    const id = await currentQuestionId(page);
    const optA = page.locator(".exam-main .option").first();
    await optA.locator(".tr-en").tap();
    await expect(optA.locator(".tr-ar")).toBeVisible();
    await expect(page.locator(`#q-${id}-A`)).not.toBeChecked();
    await page.locator(`label[for="q-${id}-A"]`).tap();
    await expect(page.locator(`#q-${id}-A`)).toBeChecked();
    await page.locator(".exam-bar").tap(); // tap outside closes pinned translation
    await expect(optA.locator(".tr-ar")).toBeHidden();
    await optA.locator(".tr-en").tap();
    await page.screenshot({ path: "../../docs/screenshots/web/exam-mobile-390-arabic.png" });
  });
});
