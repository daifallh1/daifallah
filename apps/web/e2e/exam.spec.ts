import { expect, test } from "@playwright/test";
import { answerAll, currentQuestionId, keyOf, startExam } from "./helpers";

test.describe("Full exam mechanics", () => {
  test("timer, closed book, flag, navigate, edit, resume after reload, confirm submit", async ({ page }) => {
    await startExam(page);
    await expect(page.locator(".timer")).toContainText(/(60:00|59:5\d)/);
    await expect(page.locator(".exam-bar")).toContainText("1 / 40");
    // closed book: no key/explanation visible during the attempt
    await expect(page.locator(".badge.ok")).toHaveCount(0);
    await expect(page.locator(".explanation")).toHaveCount(0);

    const id1 = await currentQuestionId(page);
    await page.locator(`#q-${id1}-A`).check();
    await page.locator(`#q-${id1}-C`).check(); // edit answer
    await page.getByRole("button", { name: /Flag for review/ }).click();
    await expect(page.getByRole("button", { name: /Flagged/ })).toBeVisible();
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.locator(".exam-bar")).toContainText("2 / 40");
    await expect(page.locator(".exam-bar")).toContainText("1 answered");

    await page.reload();
    await page.locator(".exam-main .stem").waitFor();
    await expect(page.locator(".exam-bar")).toContainText("1 answered · 39 unanswered · 1 flagged");
    await page.getByRole("button", { name: "← Previous" }).click();
    await expect(page.locator(`#q-${id1}-C`)).toBeChecked();

    await page.getByRole("button", { name: /Submit exam…/ }).click({ force: true });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("39 question(s) unanswered");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: /Submit exam…/ }).click({ force: true });
    await page.getByRole("button", { name: "Submit now" }).click();
    await expect(page).toHaveURL(/\/results\//);
    const score = Number(await page.getByTestId("score").textContent());
    expect(score).toBe(keyOf(id1) === "C" ? 1 : 0);
    await expect(page.getByTestId("result")).toContainText("FAIL");
  });

  test("26/40 passes and wrong-answer review lists exactly the 14 misses", async ({ page }) => {
    await startExam(page);
    await answerAll(page, 26);
    await page.getByRole("button", { name: "Review & submit" }).click();
    await page.getByRole("button", { name: "Submit now" }).click();
    await expect(page.getByTestId("score")).toHaveText("26");
    await expect(page.getByTestId("result")).toContainText("PASS");
    await expect(page.getByTestId("result")).toContainText("65%");
    await page.getByRole("link", { name: /Review wrong answers \(14\)/ }).click();
    await expect(page.getByTestId("wrong-item")).toHaveCount(14);
    await expect(page.getByTestId("wrong-item").first().locator(".badge.ok")).toHaveCount(1);
    await expect(page.getByTestId("wrong-item").first()).toContainText("Source: ITIL Foundation 11-05-26.pdf, page");
  });

  test("25/40 fails", async ({ page }) => {
    await startExam(page);
    await answerAll(page, 25);
    await page.getByRole("button", { name: "Review & submit" }).click();
    await page.getByRole("button", { name: "Submit now" }).click();
    await expect(page.getByTestId("score")).toHaveText("25");
    await expect(page.getByTestId("result")).toContainText("FAIL");
  });

  test("auto-submits when the 60-minute timer expires", async ({ page }) => {
    await page.clock.install();
    await startExam(page);
    const id = await currentQuestionId(page);
    await page.locator(`#q-${id}-${keyOf(id)}`).check();
    await page.clock.fastForward(60 * 60_000 + 5_000);
    await expect(page).toHaveURL(/\/results\/.*timeout=1/, { timeout: 15_000 });
    await expect(page.getByText(/Time is up/)).toBeVisible();
    await expect(page.getByTestId("score")).toHaveText("1");
    await expect(page.getByTestId("result")).toContainText("Elapsed 1:00:00");
  });

  test("mistakes-only practice uses only previously missed questions", async ({ page }) => {
    await startExam(page);
    await answerAll(page, 30);
    await page.getByRole("button", { name: "Review & submit" }).click();
    await page.getByRole("button", { name: "Submit now" }).click();
    await page.getByRole("link", { name: /Review wrong answers/ }).click();
    await expect(page.getByTestId("wrong-item")).toHaveCount(10);
    const wrongNames = await page.locator('[data-testid="wrong-item"] input[type="radio"][value="A"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLInputElement).name.split("-").slice(-3).join("-")));
    await page.goto("/mistakes/");
    await page.getByRole("button", { name: /Start mistakes practice/ }).click();
    await page.locator(".exam-main .stem").waitFor();
    await expect(page.locator(".timer")).toHaveText("Untimed practice");
    const total = Number((await page.locator(".exam-bar .pos").textContent())!.split("/")[1]);
    expect(total).toBe(10);
    for (let i = 0; i < total; i++) {
      const id = await currentQuestionId(page);
      expect(wrongNames.some((n) => id.endsWith(n))).toBe(true);
      if (i < total - 1) await page.getByRole("button", { name: "Next →" }).click();
    }
  });
});
