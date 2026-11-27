import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

const bank = JSON.parse(readFileSync(resolve(__dirname, "../../../packages/content/web-frozen/bank.json"), "utf8"));
const keyById = new Map<string, string>(bank.questions.map((q: { questionId: string; sourceAnswerKey: string }) => [q.questionId, q.sourceAnswerKey]));
export const keyOf = (id: string) => keyById.get(id)!;

/** Returns the current question id from the radio group name `q-<id>`. */
export async function currentQuestionId(page: Page): Promise<string> {
  const name = await page.locator('.exam-main input[type="radio"]').first().getAttribute("name");
  return name!.replace(/^q-/, "");
}

export async function startExam(page: Page) {
  await page.goto("/exam/");
  await page.getByRole("button", { name: /Start exam \(60 minutes\)/ }).click();
  await page.locator(".exam-main .stem").waitFor();
}

/** Answer every question: the first `correct` with the source key, the rest with a different letter. */
export async function answerAll(page: Page, correct: number) {
  for (let i = 0; i < 40; i++) {
    const id = await currentQuestionId(page);
    const key = keyOf(id);
    const pick = i < correct ? key : key === "A" ? "B" : "A";
    await page.locator(`#q-${id}-${pick}`).check();
    if (i < 39) await page.getByRole("button", { name: "Next →" }).click();
  }
}

export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
